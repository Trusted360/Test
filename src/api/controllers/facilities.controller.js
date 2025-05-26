const knex = require('../config/database');
const { validateFacility } = require('../validators/facility.validator');

class FacilitiesController {
  // List all facilities (replaces recipe listing)
  async index(req, res) {
    try {
      const { organization_id } = req.user;
      const facilities = await knex('facilities')
        .where({ organization_id })
        .select('*')
        .orderBy('name');
      
      // Add occupancy rate calculation
      const facilitiesWithStats = await Promise.all(
        facilities.map(async (facility) => {
          const stats = await knex('units')
            .where({ facility_id: facility.id })
            .select(
              knex.raw('COUNT(*) as total_units'),
              knex.raw("COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_units")
            )
            .first();
          
          return {
            ...facility,
            ...stats,
            occupancy_rate: stats.total_units > 0 
              ? (stats.occupied_units / stats.total_units * 100).toFixed(1)
              : 0
          };
        })
      );
      
      res.json({ facilities: facilitiesWithStats });
    } catch (error) {
      console.error('Error fetching facilities:', error);
      res.status(500).json({ error: 'Failed to fetch facilities' });
    }
  }

  // Get single facility (replaces recipe detail)
  async show(req, res) {
    try {
      const { id } = req.params;
      const facility = await knex('facilities')
        .where({ id })
        .first();
      
      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      // Get units for this facility
      const units = await knex('units')
        .where({ facility_id: id })
        .select('*');
      
      // Get cameras for this facility
      const cameras = await knex('cameras')
        .where({ facility_id: id, is_active: true })
        .select('*');
      
      res.json({
        facility,
        units,
        cameras,
        stats: {
          total_units: units.length,
          occupied_units: units.filter(u => u.status === 'occupied').length,
          available_units: units.filter(u => u.status === 'available').length,
          maintenance_units: units.filter(u => u.status === 'maintenance').length
        }
      });
    } catch (error) {
      console.error('Error fetching facility:', error);
      res.status(500).json({ error: 'Failed to fetch facility' });
    }
  }

  // Create new facility (replaces recipe creation)
  async create(req, res) {
    try {
      const { error } = validateFacility(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      
      const facilityData = {
        ...req.body,
        organization_id: req.user.organization_id
      };
      
      const [facility] = await knex('facilities')
        .insert(facilityData)
        .returning('*');
      
      res.status(201).json({ facility });
    } catch (error) {
      console.error('Error creating facility:', error);
      res.status(500).json({ error: 'Failed to create facility' });
    }
  }

  // Update facility (replaces recipe update)
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [facility] = await knex('facilities')
        .where({ id })
        .update(updates)
        .returning('*');
      
      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.json({ facility });
    } catch (error) {
      console.error('Error updating facility:', error);
      res.status(500).json({ error: 'Failed to update facility' });
    }
  }

  // Delete facility (replaces recipe deletion)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await knex('facilities')
        .where({ id })
        .delete();
      
      if (!deleted) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting facility:', error);
      res.status(500).json({ error: 'Failed to delete facility' });
    }
  }
}

module.exports = new FacilitiesController(); 