const db = require('../config/database');

const propertiesController = {
  async index(req, res) {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      const properties = await db('properties')
        .leftJoin('property_types', 'properties.property_type_id', 'property_types.id')
        .where('properties.tenant_id', tenantId)
        .select(
          'properties.*',
          'property_types.name as property_type_name',
          'property_types.code as property_type_code'
        )
        .orderBy('properties.name');
      
      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  },

  async show(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || 'default';
      
      const property = await db('properties')
        .leftJoin('property_types', 'properties.property_type_id', 'property_types.id')
        .where({ 'properties.id': id, 'properties.tenant_id': tenantId })
        .select(
          'properties.*',
          'property_types.name as property_type_name',
          'property_types.code as property_type_code'
        )
        .first();
      
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      res.json(property);
    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  },

  async create(req, res) {
    try {
      const { name, address, property_type_id, status } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      if (!name) {
        return res.status(400).json({ error: 'Property name is required' });
      }
      
      const [propertyId] = await db('properties')
        .insert({
          name,
          address,
          property_type_id,
          status: status || 'active',
          tenant_id: tenantId
        })
        .returning('id');
      
      const property = await db('properties')
        .leftJoin('property_types', 'properties.property_type_id', 'property_types.id')
        .where('properties.id', propertyId)
        .select(
          'properties.*',
          'property_types.name as property_type_name',
          'property_types.code as property_type_code'
        )
        .first();
      
      res.status(201).json(property);
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ error: 'Failed to create property' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, address, property_type_id, status } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (property_type_id !== undefined) updateData.property_type_id = property_type_id;
      if (status !== undefined) updateData.status = status;
      
      const updated = await db('properties')
        .where({ id, tenant_id: tenantId })
        .update(updateData)
        .returning('*');
      
      if (updated.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      const property = await db('properties')
        .leftJoin('property_types', 'properties.property_type_id', 'property_types.id')
        .where('properties.id', id)
        .select(
          'properties.*',
          'property_types.name as property_type_name',
          'property_types.code as property_type_code'
        )
        .first();
      
      res.json(property);
    } catch (error) {
      console.error('Error updating property:', error);
      res.status(500).json({ error: 'Failed to update property' });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || 'default';
      
      const deleted = await db('properties')
        .where({ id, tenant_id: tenantId })
        .del();
      
      if (deleted === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  },

  async getPropertyTypes(req, res) {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      const propertyTypes = await db('property_types')
        .where('tenant_id', tenantId)
        .where('is_active', true)
        .select('id', 'code', 'name', 'description')
        .orderBy('name');
      
      res.json(propertyTypes);
    } catch (error) {
      console.error('Error fetching property types:', error);
      res.status(500).json({ error: 'Failed to fetch property types' });
    }
  }
};

module.exports = propertiesController;
