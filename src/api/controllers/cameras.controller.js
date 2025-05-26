const knex = require('../config/database');

class CamerasController {
  async index(req, res) {
    try {
      const { facilityId } = req.params;
      const cameras = await knex('cameras')
        .where({ facility_id: facilityId, is_active: true })
        .select('*');
      
      res.json({ cameras });
    } catch (error) {
      console.error('Error fetching cameras:', error);
      res.status(500).json({ error: 'Failed to fetch cameras' });
    }
  }

  async create(req, res) {
    try {
      const { facilityId } = req.params;
      const cameraData = {
        ...req.body,
        facility_id: facilityId
      };

      const [camera] = await knex('cameras')
        .insert(cameraData)
        .returning('*');

      res.status(201).json({ camera });
    } catch (error) {
      console.error('Error creating camera:', error);
      res.status(500).json({ error: 'Failed to create camera' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const camera = await knex('cameras')
        .where({ id })
        .first();

      if (!camera) {
        return res.status(404).json({ error: 'Camera not found' });
      }

      res.json({ camera });
    } catch (error) {
      console.error('Error fetching camera:', error);
      res.status(500).json({ error: 'Failed to fetch camera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const [camera] = await knex('cameras')
        .where({ id })
        .update(req.body)
        .returning('*');

      if (!camera) {
        return res.status(404).json({ error: 'Camera not found' });
      }

      res.json({ camera });
    } catch (error) {
      console.error('Error updating camera:', error);
      res.status(500).json({ error: 'Failed to update camera' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await knex('cameras')
        .where({ id })
        .delete();

      if (!deleted) {
        return res.status(404).json({ error: 'Camera not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting camera:', error);
      res.status(500).json({ error: 'Failed to delete camera' });
    }
  }

  async getStream(req, res) {
    try {
      const { id } = req.params;
      const camera = await knex('cameras')
        .where({ id })
        .first();

      if (!camera) {
        return res.status(404).json({ error: 'Camera not found' });
      }

      // TODO: Implement actual streaming logic
      res.json({ 
        stream_url: camera.stream_url,
        type: camera.type 
      });
    } catch (error) {
      console.error('Error getting camera stream:', error);
      res.status(500).json({ error: 'Failed to get camera stream' });
    }
  }
}

module.exports = new CamerasController(); 