const logger = require('../utils/logger');

class ChecklistService {
  constructor(knex) {
    this.knex = knex;
  }

  // Template Management
  async getTemplates(tenantId, propertyType = null) {
    try {
      let query = this.knex('checklist_templates as ct')
        .select(
          'ct.id',
          'ct.name',
          'ct.description',
          'ct.category',
          'ct.is_active',
          'ct.created_by',
          'ct.tenant_id',
          'ct.created_at',
          'ct.updated_at'
        )
        .where('ct.tenant_id', tenantId)
        .where('ct.is_active', true)
        .orderBy('ct.name');

      if (propertyType) {
        query = query
          .join('template_property_types as tpt', 'ct.id', 'tpt.template_id')
          .join('property_types as pt', 'tpt.property_type_id', 'pt.id')
          .where('pt.code', propertyType);
      }

      const templates = await query;
      
      // Get item counts for each template
      for (let template of templates) {
        const itemCount = await this.knex('checklist_items')
          .where('template_id', template.id)
          .count('id as count')
          .first();
        template.item_count = parseInt(itemCount.count);
      }

      return templates;
    } catch (error) {
      logger.error('Error fetching checklist templates:', error);
      throw error;
    }
  }

  async getTemplateById(id, tenantId) {
    try {
      const template = await this.knex('checklist_templates')
        .where('id', id)
        .where('tenant_id', tenantId)
        .first();

      if (!template) {
        throw new Error('Template not found');
      }

      // Get template items
      const items = await this.knex('checklist_items')
        .where('template_id', id)
        .orderBy('sort_order');

      template.items = items;
      return template;
    } catch (error) {
      logger.error('Error fetching checklist template:', error);
      throw error;
    }
  }

  async createTemplate(templateData, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      const { name, description, property_type_ids = [], category, items = [], created_by } = templateData;

      // Create template
      const [template] = await trx('checklist_templates')
        .insert({
          name,
          description,
          category: category || 'inspection', // Use provided category or default to 'inspection'
          tenant_id: tenantId,
          created_by,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Create property type associations if provided
      if (property_type_ids.length > 0) {
        const associations = property_type_ids.map(propertyTypeId => ({
          template_id: template.id,
          property_type_id: propertyTypeId
        }));
        await trx('template_property_types').insert(associations);
      }

      // Create template items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          template_id: template.id,
          item_text: item.item_text,
          item_type: item.item_type || 'text',
          is_required: item.is_required || false,
          sort_order: item.sort_order || index,
          config_json: item.config_json || {}
        }));

        await trx('checklist_items').insert(itemsToInsert);
      }

      await trx.commit();

      // Return template with items
      return await this.getTemplateById(template.id, tenantId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating checklist template:', error);
      throw error;
    }
  }

  async updateTemplate(id, templateData, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      const { name, description, property_type_ids = [], category, items = [] } = templateData;

      // Update template
      await trx('checklist_templates')
        .where('id', id)
        .where('tenant_id', tenantId)
        .update({
          name,
          description,
          category: category || 'inspection', // Use provided category or default to 'inspection'
          updated_at: new Date()
        });

      // Update property type associations
      // Delete existing associations
      await trx('template_property_types').where('template_id', id).del();
      
      // Create new associations if provided
      if (property_type_ids.length > 0) {
        const associations = property_type_ids.map(propertyTypeId => ({
          template_id: id,
          property_type_id: propertyTypeId
        }));
        await trx('template_property_types').insert(associations);
      }

      // Delete existing items and recreate
      await trx('checklist_items').where('template_id', id).del();

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          template_id: id,
          item_text: item.item_text,
          item_type: item.item_type || 'text',
          is_required: item.is_required || false,
          sort_order: item.sort_order || index,
          config_json: item.config_json || {}
        }));

        await trx('checklist_items').insert(itemsToInsert);
      }

      await trx.commit();

      // Return updated template with items
      return await this.getTemplateById(id, tenantId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating checklist template:', error);
      throw error;
    }
  }

  async deleteTemplate(id, tenantId) {
    try {
      // Check if template is in use
      const checklistCount = await this.knex('property_checklists')
        .where('template_id', id)
        .count('id as count')
        .first();

      if (parseInt(checklistCount.count) > 0) {
        throw new Error('Cannot delete template that is in use by existing checklists');
      }

      // Soft delete by setting is_active to false
      const result = await this.knex('checklist_templates')
        .where('id', id)
        .where('tenant_id', tenantId)
        .update({
          is_active: false,
          updated_at: new Date()
        });

      if (result === 0) {
        throw new Error('Template not found');
      }

      return { success: true, message: 'Template deleted successfully' };
    } catch (error) {
      logger.error('Error deleting checklist template:', error);
      throw error;
    }
  }

  async deleteChecklist(id, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      // First verify the checklist belongs to the tenant
      const checklist = await trx('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', id)
        .where('p.tenant_id', tenantId)
        .select('pc.*')
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Check if checklist has been completed or approved
      if (checklist.status === 'completed' || checklist.status === 'approved') {
        throw new Error('Cannot delete completed or approved checklists');
      }

      // Delete related data in order (due to foreign key constraints)
      // 1. Delete comments
      await trx('checklist_comments')
        .where('checklist_id', id)
        .del();

      // 2. Delete attachments (get file paths first for cleanup)
      const attachments = await trx('checklist_attachments as ca')
        .join('checklist_responses as cr', 'ca.response_id', 'cr.id')
        .where('cr.checklist_id', id)
        .select('ca.file_path');

      await trx('checklist_attachments')
        .whereIn('response_id', function() {
          this.select('id')
            .from('checklist_responses')
            .where('checklist_id', id);
        })
        .del();

      // 3. Delete approvals
      await trx('checklist_approvals')
        .whereIn('response_id', function() {
          this.select('id')
            .from('checklist_responses')
            .where('checklist_id', id);
        })
        .del();

      // 4. Delete responses
      await trx('checklist_responses')
        .where('checklist_id', id)
        .del();

      // 5. Finally delete the checklist itself
      await trx('property_checklists')
        .where('id', id)
        .del();

      await trx.commit();

      // Clean up attachment files from disk
      const fs = require('fs').promises;
      for (const attachment of attachments) {
        try {
          await fs.unlink(attachment.file_path);
        } catch (err) {
          logger.warn('Failed to delete attachment file:', attachment.file_path, err);
        }
      }

      return { success: true, message: 'Checklist deleted successfully' };
    } catch (error) {
      await trx.rollback();
      logger.error('Error deleting checklist:', error);
      throw error;
    }
  }

  // Checklist Instance Management
  async getChecklists(tenantId, filters = {}) {
    try {
      let query = this.knex('property_checklists as pc')
        .select(
          'pc.*',
          'p.name as property_name',
          'p.address as property_address',
          'ct.name as template_name',
          'u.email as assigned_to_email'
        )
        .leftJoin('properties as p', 'pc.property_id', 'p.id')
        .leftJoin('checklist_templates as ct', 'pc.template_id', 'ct.id')
        .leftJoin('users as u', 'pc.assigned_to', 'u.id')
        .where('p.tenant_id', tenantId)
        .orderBy('pc.created_at', 'desc');

      // Apply filters
      if (filters.status) {
        query = query.where('pc.status', filters.status);
      }
      if (filters.property_id) {
        query = query.where('pc.property_id', filters.property_id);
      }
      if (filters.assigned_to) {
        query = query.where('pc.assigned_to', filters.assigned_to);
      }

      const checklists = await query;

      // Get completion stats for each checklist
      for (let checklist of checklists) {
        const stats = await this.getChecklistStats(checklist.id);
        checklist.completion_stats = stats;
      }

      return checklists;
    } catch (error) {
      logger.error('Error fetching checklists:', error);
      throw error;
    }
  }

  async getChecklistById(id, tenantId) {
    try {
      const checklist = await this.knex('property_checklists as pc')
        .select(
          'pc.*',
          'p.name as property_name',
          'p.address as property_address',
          'ct.name as template_name',
          'u.email as assigned_to_email'
        )
        .leftJoin('properties as p', 'pc.property_id', 'p.id')
        .leftJoin('checklist_templates as ct', 'pc.template_id', 'ct.id')
        .leftJoin('users as u', 'pc.assigned_to', 'u.id')
        .where('pc.id', id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Get checklist items with responses
      const items = await this.knex('checklist_items as ci')
        .select(
          'ci.*',
          'cr.id as response_id',
          'cr.response_value',
          'cr.notes',
          'cr.completed_by',
          'cr.completed_at',
          'cr.requires_approval',
          'u.email as completed_by_email'
        )
        .leftJoin('checklist_responses as cr', function() {
          this.on('ci.id', '=', 'cr.item_id')
              .andOn('cr.checklist_id', '=', checklist.id);
        })
        .leftJoin('users as u', 'cr.completed_by', 'u.id')
        .where('ci.template_id', checklist.template_id)
        .orderBy('ci.sort_order');

      // Get attachments for responses
      for (let item of items) {
        if (item.response_id) {
          const attachments = await this.knex('checklist_attachments')
            .where('response_id', item.response_id);
          item.attachments = attachments;
        } else {
          item.attachments = [];
        }
      }

      checklist.items = items;
      checklist.completion_stats = await this.getChecklistStats(id);

      return checklist;
    } catch (error) {
      logger.error('Error fetching checklist:', error);
      throw error;
    }
  }

  async createChecklist(checklistData, tenantId) {
    try {
      const { property_id, template_id, assigned_to, due_date } = checklistData;

      // Verify property belongs to tenant
      const property = await this.knex('properties')
        .where('id', property_id)
        .where('tenant_id', tenantId)
        .first();

      if (!property) {
        throw new Error('Property not found');
      }

      // Verify template exists and belongs to tenant
      const template = await this.knex('checklist_templates')
        .where('id', template_id)
        .where('tenant_id', tenantId)
        .first();

      if (!template) {
        throw new Error('Template not found');
      }

      const [checklist] = await this.knex('property_checklists')
        .insert({
          property_id,
          template_id,
          assigned_to,
          due_date: due_date ? new Date(due_date) : null,
          status: 'pending',
          created_at: new Date()
        })
        .returning('*');

      return await this.getChecklistById(checklist.id, tenantId);
    } catch (error) {
      logger.error('Error creating checklist:', error);
      throw error;
    }
  }

  async updateChecklist(id, updateData, tenantId) {
    try {
      const allowedFields = ['assigned_to', 'due_date', 'status'];
      const filteredData = {};
      
      // Only include allowed fields
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }
      
      // Add updated_at timestamp
      filteredData.updated_at = new Date();
      
      // Handle status-specific updates
      if (filteredData.status === 'completed') {
        filteredData.completed_at = new Date();
      }

      // First verify the checklist belongs to the tenant
      const checklistExists = await this.knex('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklistExists) {
        throw new Error('Checklist not found');
      }

      // Then update the checklist directly
      const result = await this.knex('property_checklists')
        .where('id', id)
        .update(filteredData);

      if (result === 0) {
        throw new Error('Failed to update checklist');
      }

      return await this.getChecklistById(id, tenantId);
    } catch (error) {
      logger.error('Error updating checklist:', error);
      throw error;
    }
  }

  async updateChecklistStatus(id, status, tenantId) {
    try {
      // First verify the checklist belongs to the tenant
      const checklistExists = await this.knex('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklistExists) {
        throw new Error('Checklist not found');
      }

      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date();
      }

      // Then update the checklist directly without join
      const result = await this.knex('property_checklists')
        .where('id', id)
        .update(updateData);

      if (result === 0) {
        throw new Error('Failed to update checklist status');
      }

      return await this.getChecklistById(id, tenantId);
    } catch (error) {
      logger.error('Error updating checklist status:', error);
      throw error;
    }
  }

  // Item Completion
  async completeItem(checklistId, itemId, responseData, userId, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      const { response_value, notes, requires_approval = false } = responseData;

      // Verify checklist belongs to tenant
      const checklist = await trx('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', checklistId)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Check if response already exists
      const existingResponse = await trx('checklist_responses')
        .where('checklist_id', checklistId)
        .where('item_id', itemId)
        .first();

      let response;
      if (existingResponse) {
        // Update existing response
        await trx('checklist_responses')
          .where('id', existingResponse.id)
          .update({
            response_value,
            notes,
            completed_by: userId,
            completed_at: new Date(),
            requires_approval
          });
        response = { ...existingResponse, response_value, notes };
      } else {
        // Create new response
        [response] = await trx('checklist_responses')
          .insert({
            checklist_id: checklistId,
            item_id: itemId,
            response_value,
            notes,
            completed_by: userId,
            completed_at: new Date(),
            requires_approval
          })
          .returning('*');
      }

      // Update checklist status to in_progress if it was pending
      await trx('property_checklists')
        .where('id', checklistId)
        .where('status', 'pending')
        .update({ status: 'in_progress' });

      await trx.commit();
      return response;
    } catch (error) {
      await trx.rollback();
      logger.error('Error completing checklist item:', error);
      throw error;
    }
  }

  async uploadAttachment(responseId, fileData, userId) {
    try {
      const { file_name, file_path, file_type, file_size } = fileData;

      const [attachment] = await this.knex('checklist_attachments')
        .insert({
          response_id: responseId,
          file_name,
          file_path,
          file_type,
          file_size,
          uploaded_by: userId,
          uploaded_at: new Date()
        })
        .returning('*');

      return attachment;
    } catch (error) {
      logger.error('Error uploading attachment:', error);
      throw error;
    }
  }

  async getAttachment(attachmentId, tenantId) {
    try {
      // Get attachment with verification that it belongs to the tenant
      const attachment = await this.knex('checklist_attachments as ca')
        .select('ca.*')
        .join('checklist_responses as cr', 'ca.response_id', 'cr.id')
        .join('property_checklists as pc', 'cr.checklist_id', 'pc.id')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('ca.id', attachmentId)
        .where('p.tenant_id', tenantId)
        .first();

      return attachment;
    } catch (error) {
      logger.error('Error fetching attachment:', error);
      throw error;
    }
  }

  // Comment Management
  async addComment(checklistId, itemId, commentData, userId, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      const { comment_text } = commentData;

      // Verify checklist belongs to tenant
      const checklist = await trx('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', checklistId)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Create comment
      const [comment] = await trx('checklist_comments')
        .insert({
          checklist_id: checklistId,
          item_id: itemId,
          comment_text,
          created_by: userId,
          created_at: new Date()
        })
        .returning('*');

      // Get user info for the comment
      const user = await trx('users')
        .where('id', userId)
        .select('email', 'first_name', 'last_name')
        .first();

      comment.created_by_email = user.email;
      comment.created_by_name = `${user.first_name} ${user.last_name}`;

      await trx.commit();
      return comment;
    } catch (error) {
      await trx.rollback();
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  async getComments(checklistId, itemId, tenantId) {
    try {
      // Verify checklist belongs to tenant
      const checklist = await this.knex('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', checklistId)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Get comments with user info
      const comments = await this.knex('checklist_comments as cc')
        .select(
          'cc.*',
          'u.email as created_by_email',
          this.knex.raw("CONCAT(u.first_name, ' ', u.last_name) as created_by_name")
        )
        .join('users as u', 'cc.created_by', 'u.id')
        .where('cc.checklist_id', checklistId)
        .where('cc.item_id', itemId)
        .orderBy('cc.created_at', 'desc');

      return comments;
    } catch (error) {
      logger.error('Error fetching comments:', error);
      throw error;
    }
  }

  async deleteComment(commentId, userId, tenantId) {
    try {
      // Verify comment exists and user has permission
      const comment = await this.knex('checklist_comments as cc')
        .join('property_checklists as pc', 'cc.checklist_id', 'pc.id')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('cc.id', commentId)
        .where('p.tenant_id', tenantId)
        .select('cc.*')
        .first();

      if (!comment) {
        throw new Error('Comment not found');
      }

      // Only allow comment creator to delete
      if (comment.created_by !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      await this.knex('checklist_comments')
        .where('id', commentId)
        .del();

      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Uncomplete Item
  async uncompleteItem(checklistId, itemId, userId, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      // Verify checklist belongs to tenant
      const checklist = await trx('property_checklists as pc')
        .join('properties as p', 'pc.property_id', 'p.id')
        .where('pc.id', checklistId)
        .where('p.tenant_id', tenantId)
        .first();

      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Delete the response to uncomplete the item
      const result = await trx('checklist_responses')
        .where('checklist_id', checklistId)
        .where('item_id', itemId)
        .del();

      if (result === 0) {
        throw new Error('Item response not found');
      }

      await trx.commit();
      return { success: true, message: 'Item uncompleted successfully' };
    } catch (error) {
      await trx.rollback();
      logger.error('Error uncompleting item:', error);
      throw error;
    }
  }

  // Approval Workflow
  async getApprovalQueue(tenantId, approverId = null) {
    try {
      let query = this.knex('checklist_responses as cr')
        .select(
          'cr.*',
          'ci.item_text',
          'pc.id as checklist_id',
          'p.name as property_name',
          'ct.name as template_name',
          'u.email as completed_by_email',
          'ca.status as approval_status',
          'ca.approval_notes',
          'ca.approved_at'
        )
        .join('checklist_items as ci', 'cr.item_id', 'ci.id')
        .join('property_checklists as pc', 'cr.checklist_id', 'pc.id')
        .join('properties as p', 'pc.property_id', 'p.id')
        .join('checklist_templates as ct', 'pc.template_id', 'ct.id')
        .join('users as u', 'cr.completed_by', 'u.id')
        .leftJoin('checklist_approvals as ca', 'cr.id', 'ca.response_id')
        .where('cr.requires_approval', true)
        .where('p.tenant_id', tenantId)
        .orderBy('cr.completed_at', 'desc');

      if (approverId) {
        query = query.where(function() {
          this.where('ca.approver_id', approverId)
              .orWhere('ca.status', null); // Include items not yet assigned to an approver
        });
      }

      return await query;
    } catch (error) {
      logger.error('Error fetching approval queue:', error);
      throw error;
    }
  }

  async approveResponse(responseId, approverId, notes = null) {
    const trx = await this.knex.transaction();
    
    try {
      // Check if approval already exists
      const existingApproval = await trx('checklist_approvals')
        .where('response_id', responseId)
        .first();

      if (existingApproval) {
        // Update existing approval
        await trx('checklist_approvals')
          .where('id', existingApproval.id)
          .update({
            approver_id: approverId,
            status: 'approved',
            approval_notes: notes,
            approved_at: new Date()
          });
      } else {
        // Create new approval
        await trx('checklist_approvals')
          .insert({
            response_id: responseId,
            approver_id: approverId,
            status: 'approved',
            approval_notes: notes,
            approved_at: new Date()
          });
      }

      await trx.commit();
      return { success: true, message: 'Response approved successfully' };
    } catch (error) {
      await trx.rollback();
      logger.error('Error approving response:', error);
      throw error;
    }
  }

  async rejectResponse(responseId, approverId, notes) {
    const trx = await this.knex.transaction();
    
    try {
      // Check if approval already exists
      const existingApproval = await trx('checklist_approvals')
        .where('response_id', responseId)
        .first();

      if (existingApproval) {
        // Update existing approval
        await trx('checklist_approvals')
          .where('id', existingApproval.id)
          .update({
            approver_id: approverId,
            status: 'rejected',
            approval_notes: notes,
            approved_at: new Date()
          });
      } else {
        // Create new approval
        await trx('checklist_approvals')
          .insert({
            response_id: responseId,
            approver_id: approverId,
            status: 'rejected',
            approval_notes: notes,
            approved_at: new Date()
          });
      }

      await trx.commit();
      return { success: true, message: 'Response rejected successfully' };
    } catch (error) {
      await trx.rollback();
      logger.error('Error rejecting response:', error);
      throw error;
    }
  }

  // Helper Methods
  async getChecklistStats(checklistId) {
    try {
      // Get total items count
      const totalItems = await this.knex('checklist_items as ci')
        .join('property_checklists as pc', 'ci.template_id', 'pc.template_id')
        .where('pc.id', checklistId)
        .count('ci.id as count')
        .first();

      // Get completed items count
      const completedItems = await this.knex('checklist_responses')
        .where('checklist_id', checklistId)
        .whereNotNull('completed_at')
        .count('id as count')
        .first();

      // Get pending approval count
      const pendingApproval = await this.knex('checklist_responses as cr')
        .leftJoin('checklist_approvals as ca', 'cr.id', 'ca.response_id')
        .where('cr.checklist_id', checklistId)
        .where('cr.requires_approval', true)
        .where(function() {
          this.whereNull('ca.status').orWhere('ca.status', 'pending');
        })
        .count('cr.id as count')
        .first();

      const total = parseInt(totalItems.count);
      const completed = parseInt(completedItems.count);
      const pending = parseInt(pendingApproval.count);

      return {
        total_items: total,
        completed_items: completed,
        pending_approval: pending,
        completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    } catch (error) {
      logger.error('Error calculating checklist stats:', error);
      return {
        total_items: 0,
        completed_items: 0,
        pending_approval: 0,
        completion_percentage: 0
      };
    }
  }

  async getChecklistsByProperty(propertyId, tenantId) {
    try {
      return await this.getChecklists(tenantId, { property_id: propertyId });
    } catch (error) {
      logger.error('Error fetching checklists by property:', error);
      throw error;
    }
  }

  async getChecklistsByUser(userId, tenantId, status = null) {
    try {
      const filters = { assigned_to: userId };
      if (status) {
        filters.status = status;
      }
      return await this.getChecklists(tenantId, filters);
    } catch (error) {
      logger.error('Error fetching checklists by user:', error);
      throw error;
    }
  }
}

module.exports = ChecklistService;
