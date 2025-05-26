const knex = require('../config/database');

class MaintenanceController {
  async index(req, res) {
    try {
      const { facility_id, status, priority } = req.query;
      let query = knex('maintenance_tickets')
        .leftJoin('facilities', 'maintenance_tickets.facility_id', 'facilities.id')
        .leftJoin('units', 'maintenance_tickets.unit_id', 'units.id')
        .leftJoin('users as reporter', 'maintenance_tickets.reported_by', 'reporter.id')
        .leftJoin('users as assignee', 'maintenance_tickets.assigned_to', 'assignee.id')
        .select(
          'maintenance_tickets.*',
          'facilities.name as facility_name',
          'units.unit_number',
          'reporter.first_name as reporter_first_name',
          'reporter.last_name as reporter_last_name',
          'assignee.first_name as assignee_first_name',
          'assignee.last_name as assignee_last_name'
        );

      if (facility_id) query = query.where('maintenance_tickets.facility_id', facility_id);
      if (status) query = query.where('maintenance_tickets.status', status);
      if (priority) query = query.where('maintenance_tickets.priority', priority);

      const tickets = await query.orderBy('created_at', 'desc');
      res.json({ tickets });
    } catch (error) {
      console.error('Error fetching maintenance tickets:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance tickets' });
    }
  }

  async create(req, res) {
    try {
      const ticketData = {
        ...req.body,
        reported_by: req.user.id
      };

      const [ticket] = await knex('maintenance_tickets')
        .insert(ticketData)
        .returning('*');

      res.status(201).json({ ticket });
    } catch (error) {
      console.error('Error creating maintenance ticket:', error);
      res.status(500).json({ error: 'Failed to create maintenance ticket' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const ticket = await knex('maintenance_tickets')
        .where({ 'maintenance_tickets.id': id })
        .leftJoin('facilities', 'maintenance_tickets.facility_id', 'facilities.id')
        .leftJoin('units', 'maintenance_tickets.unit_id', 'units.id')
        .leftJoin('users as reporter', 'maintenance_tickets.reported_by', 'reporter.id')
        .leftJoin('users as assignee', 'maintenance_tickets.assigned_to', 'assignee.id')
        .select(
          'maintenance_tickets.*',
          'facilities.name as facility_name',
          'units.unit_number',
          'reporter.first_name as reporter_first_name',
          'reporter.last_name as reporter_last_name',
          'assignee.first_name as assignee_first_name',
          'assignee.last_name as assignee_last_name'
        )
        .first();

      if (!ticket) {
        return res.status(404).json({ error: 'Maintenance ticket not found' });
      }

      // Get comments
      const comments = await knex('maintenance_comments')
        .where({ ticket_id: id })
        .leftJoin('users', 'maintenance_comments.user_id', 'users.id')
        .select(
          'maintenance_comments.*',
          'users.first_name',
          'users.last_name'
        )
        .orderBy('created_at', 'asc');

      res.json({ ticket, comments });
    } catch (error) {
      console.error('Error fetching maintenance ticket:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance ticket' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // If status is being changed to resolved, set resolved_at
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updates.resolved_at = new Date();
      }

      const [ticket] = await knex('maintenance_tickets')
        .where({ id })
        .update(updates)
        .returning('*');

      if (!ticket) {
        return res.status(404).json({ error: 'Maintenance ticket not found' });
      }

      res.json({ ticket });
    } catch (error) {
      console.error('Error updating maintenance ticket:', error);
      res.status(500).json({ error: 'Failed to update maintenance ticket' });
    }
  }

  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { comment, attachments = [] } = req.body;

      const commentData = {
        ticket_id: id,
        user_id: req.user.id,
        comment,
        attachments
      };

      const [newComment] = await knex('maintenance_comments')
        .insert(commentData)
        .returning('*');

      res.status(201).json({ comment: newComment });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
}

module.exports = new MaintenanceController(); 