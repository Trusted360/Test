const knex = require('../config/database');

class UnitsController {
  // List all units with filters
  async index(req, res) {
    try {
      const { facility_id, status, size } = req.query;
      let query = knex('units')
        .leftJoin('facilities', 'units.facility_id', 'facilities.id')
        .leftJoin('contracts', function() {
          this.on('units.id', '=', 'contracts.unit_id')
            .andOn('contracts.status', '=', knex.raw('?', ['active']));
        })
        .leftJoin('users as tenants', 'contracts.tenant_id', 'tenants.id')
        .select(
          'units.*',
          'facilities.name as facility_name',
          'tenants.first_name as tenant_first_name',
          'tenants.last_name as tenant_last_name',
          'tenants.email as tenant_email',
          'contracts.start_date as lease_start',
          'contracts.end_date as lease_end'
        );

      if (facility_id) query = query.where('units.facility_id', facility_id);
      if (status) query = query.where('units.status', status);
      if (size) query = query.where('units.size', size);

      const units = await query;
      res.json({ units });
    } catch (error) {
      console.error('Error fetching units:', error);
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  }

  // Get single unit details
  async show(req, res) {
    try {
      const { id } = req.params;
      const unit = await knex('units')
        .where({ 'units.id': id })
        .leftJoin('facilities', 'units.facility_id', 'facilities.id')
        .leftJoin('contracts', function() {
          this.on('units.id', '=', 'contracts.unit_id')
            .andOn('contracts.status', '=', knex.raw('?', ['active']));
        })
        .leftJoin('users as tenants', 'contracts.tenant_id', 'tenants.id')
        .select(
          'units.*',
          'facilities.name as facility_name',
          'facilities.address as facility_address',
          'tenants.id as tenant_id',
          'tenants.first_name as tenant_first_name',
          'tenants.last_name as tenant_last_name',
          'tenants.email as tenant_email',
          'tenants.phone as tenant_phone',
          'contracts.start_date as lease_start',
          'contracts.end_date as lease_end',
          'contracts.monthly_rate as lease_rate'
        )
        .first();

      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      // Get recent events for this unit
      const recentEvents = await knex('video_events')
        .where({ unit_id: id })
        .orderBy('occurred_at', 'desc')
        .limit(10);

      res.json({ unit, recentEvents });
    } catch (error) {
      console.error('Error fetching unit:', error);
      res.status(500).json({ error: 'Failed to fetch unit' });
    }
  }

  // Create new unit
  async create(req, res) {
    try {
      const { facilityId } = req.params;
      const unitData = {
        ...req.body,
        facility_id: facilityId
      };

      const [unit] = await knex('units')
        .insert(unitData)
        .returning('*');

      // Update facility unit count
      await knex('facilities')
        .where({ id: facilityId })
        .increment('total_units', 1);

      res.status(201).json({ unit });
    } catch (error) {
      console.error('Error creating unit:', error);
      res.status(500).json({ error: 'Failed to create unit' });
    }
  }

  // Update unit
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [unit] = await knex('units')
        .where({ id })
        .update(updates)
        .returning('*');

      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      res.json({ unit });
    } catch (error) {
      console.error('Error updating unit:', error);
      res.status(500).json({ error: 'Failed to update unit' });
    }
  }

  // Delete unit
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const unit = await knex('units').where({ id }).first();
      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      await knex('units').where({ id }).delete();

      // Update facility unit count
      await knex('facilities')
        .where({ id: unit.facility_id })
        .decrement('total_units', 1);

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting unit:', error);
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  }

  // Get unit events
  async getEvents(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const events = await knex('video_events')
        .where({ unit_id: id })
        .leftJoin('cameras', 'video_events.camera_id', 'cameras.id')
        .select(
          'video_events.*',
          'cameras.name as camera_name',
          'cameras.type as camera_type'
        )
        .orderBy('occurred_at', 'desc')
        .limit(limit)
        .offset(offset);

      const total = await knex('video_events')
        .where({ unit_id: id })
        .count('* as count')
        .first();

      res.json({ 
        events, 
        pagination: {
          total: parseInt(total.count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching unit events:', error);
      res.status(500).json({ error: 'Failed to fetch unit events' });
    }
  }
}

module.exports = new UnitsController(); 