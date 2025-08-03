const express = require('express');
const { authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

module.exports = function(services) {
  const router = express.Router();
  const { userModel } = services;
  const db = userModel.db;

  // All user management routes require admin role
  router.use(authorize(['admin']));

  /**
   * @route GET /api/users
   * @desc Get all users with roles
   * @access Admin only
   */
  router.get('/', async (req, res) => {
    try {
      const users = await db('users')
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .select(
          'users.id',
          'users.first_name',
          'users.last_name',
          'users.email',
          'users.role',
          'users.admin_level',
          'users.email_verified',
          'users.created_at',
          'users.updated_at',
          db.raw('array_agg(roles.name) as roles')
        )
        .groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role', 'users.admin_level', 'users.email_verified', 'users.created_at', 'users.updated_at')
        .orderBy('users.created_at', 'desc');

      res.json({
        success: true,
        data: users.map(user => ({
          ...user,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          roles: user.roles?.filter(r => r) || []
        }))
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  });

  /**
   * @route GET /api/users/:id
   * @desc Get single user
   * @access Admin only
   */
  router.get('/:id', async (req, res) => {
    try {
      const user = await db('users')
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .where('users.id', req.params.id)
        .select(
          'users.*',
          db.raw('array_agg(roles.name) as roles')
        )
        .groupBy('users.id')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...user,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          roles: user.roles?.filter(r => r) || []
        }
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  });

  /**
   * @route PUT /api/users/:id
   * @desc Update user details
   * @access Admin only
   */
  router.put('/:id', async (req, res) => {
    try {
      const { name, first_name, last_name, email, roles } = req.body;
      
      await db.transaction(async (trx) => {
        // Update user - handle both name and first_name/last_name
        const updateData = {
          email,
          updated_at: db.fn.now()
        };
        
        if (name) {
          // If name is provided, split into first and last name
          const nameParts = name.split(' ');
          updateData.first_name = nameParts[0] || '';
          updateData.last_name = nameParts.slice(1).join(' ') || '';
        } else {
          // If first_name/last_name provided directly
          if (first_name !== undefined) updateData.first_name = first_name;
          if (last_name !== undefined) updateData.last_name = last_name;
        }
        
        await trx('users')
          .where('id', req.params.id)
          .update(updateData);

        // Update roles if provided
        if (roles && Array.isArray(roles)) {
          // Delete existing roles
          await trx('user_roles')
            .where('user_id', req.params.id)
            .del();

          // Get role IDs
          const roleRecords = await trx('roles')
            .whereIn('name', roles)
            .select('id', 'name');

          // Insert new roles
          if (roleRecords.length > 0) {
            await trx('user_roles').insert(
              roleRecords.map(role => ({
                user_id: req.params.id,
                role_id: role.id
              }))
            );
          }
        }
      });

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  });

  /**
   * @route POST /api/users
   * @desc Create new user
   * @access Admin only
   */
  router.post('/', async (req, res) => {
    try {
      const { name, first_name, last_name, email, password, roles } = req.body;
      
      // Check if user already exists
      const existingUser = await db('users')
        .where('email', email)
        .first();
        
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      const [userId] = await db.transaction(async (trx) => {
        // Create user - handle both name and first_name/last_name
        const userData = {
          email,
          password: hashedPassword,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          tenant_id: 'default'
        };
        
        if (name) {
          // If name is provided, split into first and last name
          const nameParts = name.split(' ');
          userData.first_name = nameParts[0] || '';
          userData.last_name = nameParts.slice(1).join(' ') || '';
        } else {
          // If first_name/last_name provided directly
          userData.first_name = first_name || '';
          userData.last_name = last_name || '';
        }
        
        const [newUserId] = await trx('users')
          .insert(userData)
          .returning('id');

        // Add roles if provided
        if (roles && Array.isArray(roles) && roles.length > 0) {
          const roleRecords = await trx('roles')
            .whereIn('name', roles)
            .select('id');

          if (roleRecords.length > 0) {
            await trx('user_roles').insert(
              roleRecords.map(role => ({
                user_id: newUserId,
                role_id: role.id
              }))
            );
          }
        }

        return [newUserId];
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { id: userId }
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  });

  /**
   * @route DELETE /api/users/:id
   * @desc Delete user (hard delete - remove from database)
   * @access Admin only
   */
  router.delete('/:id', async (req, res) => {
    try {
      // Don't allow deleting yourself
      if (req.user.id === parseInt(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      await db.transaction(async (trx) => {
        // Delete user roles first
        await trx('user_roles')
          .where('user_id', req.params.id)
          .del();
        
        // Delete user
        await trx('users')
          .where('id', req.params.id)
          .del();
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  });

  /**
   * @route POST /api/users/:id/reset-password
   * @desc Reset user password
   * @access Admin only
   */
  router.post('/:id/reset-password', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      await db('users')
        .where('id', req.params.id)
        .update({
          password: hashedPassword,
          updated_at: db.fn.now()
        });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  });

  /**
   * @route GET /api/users/roles/list
   * @desc Get all available roles
   * @access Admin only
   */
  router.get('/roles/list', async (req, res) => {
    try {
      const roles = await db('roles')
        .select('id', 'name', 'description')
        .orderBy('name');

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      });
    }
  });

  return router;
};