const { Model } = require('objection');

class PropertyService {
  constructor(knex) {
    this.knex = knex;
  }

  /**
   * Get all properties with optional filtering
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Optional filters (propertyType, status, search)
   * @returns {Promise<Array>} Array of properties
   */
  async getAllProperties(tenantId, filters = {}) {
    try {
      let query = this.knex('properties')
        .where('tenant_id', tenantId)
        .orderBy('created_at', 'desc');

      // Apply filters
      if (filters.propertyType) {
        query = query.where('property_type_id', filters.propertyType);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${filters.search}%`)
              .orWhere('address', 'ilike', `%${filters.search}%`);
        });
      }

      const properties = await query;
      return properties;
    } catch (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
  }

  /**
   * Get property by ID
   * @param {number} id - Property ID
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Property object
   */
  async getPropertyById(id, tenantId) {
    try {
      const property = await this.knex('properties')
        .where({ id, tenant_id: tenantId })
        .first();

      if (!property) {
        throw new Error('Property not found');
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to fetch property: ${error.message}`);
    }
  }

  /**
   * Create new property
   * @param {Object} propertyData - Property data
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Created property
   */
  async createProperty(propertyData, tenantId) {
    try {
      const { name, address, property_type_id, status = 'active' } = propertyData;

      // Validate required fields
      if (!name) {
        throw new Error('Property name is required');
      }

      const [property] = await this.knex('properties')
        .insert({
          name,
          address,
          property_type_id,
          status,
          tenant_id: tenantId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Log audit event
      if (this.auditService) {
        await this.auditService.logEvent('property', 'created', {
          userId: null, // TODO: Pass userId from controller
          tenantId: tenantId,
          propertyId: property.id,
          entityType: 'property',
          entityId: property.id,
          description: `Created property: ${name}`,
          metadata: {
            propertyName: name,
            address: address,
            propertyType: property_type_id,
            status: status
          }
        });
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }
  }

  /**
   * Update property
   * @param {number} id - Property ID
   * @param {Object} propertyData - Updated property data
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Updated property
   */
  async updateProperty(id, propertyData, tenantId) {
    try {
      const { name, address, property_type_id, status } = propertyData;

      // Check if property exists and belongs to tenant
      const existingProperty = await this.getPropertyById(id, tenantId);
      if (!existingProperty) {
        throw new Error('Property not found');
      }

      const updateData = {
        updated_at: new Date()
      };

      // Only update provided fields
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (property_type_id !== undefined) updateData.property_type_id = property_type_id;
      if (status !== undefined) updateData.status = status;

      const [property] = await this.knex('properties')
        .where({ id, tenant_id: tenantId })
        .update(updateData)
        .returning('*');

      // Log audit event
      if (this.auditService) {
        const changes = [];
        if (name !== undefined && name !== existingProperty.name) changes.push(`name: ${existingProperty.name} → ${name}`);
        if (address !== undefined && address !== existingProperty.address) changes.push(`address: ${existingProperty.address} → ${address}`);
        if (property_type_id !== undefined && property_type_id !== existingProperty.property_type_id) changes.push(`type: ${existingProperty.property_type_id} → ${property_type_id}`);
        if (status !== undefined && status !== existingProperty.status) changes.push(`status: ${existingProperty.status} → ${status}`);

        await this.auditService.logEvent('property', 'updated', {
          userId: null, // TODO: Pass userId from controller
          tenantId: tenantId,
          propertyId: id,
          entityType: 'property',
          entityId: id,
          description: `Updated property: ${property.name}`,
          oldValues: existingProperty,
          newValues: updateData,
          metadata: {
            propertyName: property.name,
            changes: changes.join(', ')
          }
        });
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  /**
   * Delete property
   * @param {number} id - Property ID
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteProperty(id, tenantId) {
    try {
      // Check if property exists and belongs to tenant
      const existingProperty = await this.getPropertyById(id, tenantId);
      if (!existingProperty) {
        throw new Error('Property not found');
      }

      // Check for dependent records in all tables
      // Note: Excluding audit_logs and operational_metrics as they are system-generated
      // and should not prevent property deletion in a demo environment
      const dependentTables = [
        { table: 'property_checklists', name: 'checklists' },
        { table: 'camera_feeds', name: 'camera feeds' },
        { table: 'service_tickets', name: 'service tickets' },
        { table: 'action_items', name: 'action items' },
        { table: 'property_inspection_summary', name: 'inspection summaries' },
        { table: 'recurring_issues', name: 'recurring issues' },
        { table: 'property_manager_metrics', name: 'property manager metrics' },
        { table: 'scheduled_checklist_generations', name: 'scheduled checklists' }
        // Excluded: audit_logs, operational_metrics (system-generated records)
      ];

      const dependencies = [];
      
      for (const { table, name } of dependentTables) {
        try {
          const count = await this.knex(table)
            .where('property_id', id)
            .count('* as count')
            .first();
          
          if (parseInt(count.count) > 0) {
            dependencies.push(`${count.count} ${name}`);
            console.log(`Property ${id} has ${count.count} ${name}`);
          }
        } catch (error) {
          console.log(`Warning: Could not check ${table}:`, error.message);
        }
      }

      if (dependencies.length > 0) {
        throw new Error(`Cannot delete property: It has associated records (${dependencies.join(', ')}). Please remove them first.`);
      }

      // Delete system-generated records first (these should cascade automatically)
      // But we'll do it explicitly to ensure clean deletion
      await this.knex('audit_logs')
        .where('property_id', id)
        .del();
        
      await this.knex('operational_metrics')
        .where('property_id', id)
        .del();
        
      // Delete any records in tables with CASCADE DELETE
      await this.knex('property_notification_targets')
        .where('property_id', id)
        .del();
      
      // Now delete the property
      const deleteResult = await this.knex('properties')
        .where({ id, tenant_id: tenantId })
        .del();
      
      console.log('Delete result:', deleteResult, 'for property:', id, 'tenant:', tenantId);

      // Log audit event
      if (this.auditService) {
        await this.auditService.logEvent('property', 'deleted', {
          userId: null, // TODO: Pass userId from controller
          tenantId: tenantId,
          propertyId: id,
          entityType: 'property',
          entityId: id,
          description: `Deleted property: ${existingProperty.name}`,
          metadata: {
            propertyName: existingProperty.name,
            address: existingProperty.address,
            propertyType: existingProperty.property_type_id
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  /**
   * Get property statistics
   * @param {number} id - Property ID
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Property statistics
   */
  async getPropertyStats(id, tenantId) {
    try {
      // Verify property exists and belongs to tenant
      await this.getPropertyById(id, tenantId);

      const stats = await this.knex.raw(`
        SELECT 
          (SELECT COUNT(*) FROM property_checklists WHERE property_id = ? AND status = 'pending') as pending_checklists,
          (SELECT COUNT(*) FROM property_checklists WHERE property_id = ? AND status = 'completed') as completed_checklists,
          (SELECT COUNT(*) FROM camera_feeds WHERE property_id = ?) as camera_count,
          (SELECT COUNT(*) FROM video_alerts va 
           JOIN camera_feeds cf ON va.camera_id = cf.id 
           WHERE cf.property_id = ? AND va.status = 'active') as active_alerts
      `, [id, id, id, id]);

      return stats.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch property statistics: ${error.message}`);
    }
  }

  /**
   * Get properties with checklist summary
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Properties with checklist counts
   */
  async getPropertiesWithChecklistSummary(tenantId) {
    try {
      const properties = await this.knex.raw(`
        SELECT 
          p.*,
          COALESCE(pc.pending_count, 0) as pending_checklists,
          COALESCE(pc.completed_count, 0) as completed_checklists,
          COALESCE(pc.total_count, 0) as checklist_count,
          COALESCE(cf.camera_count, 0) as camera_count,
          COALESCE(va.active_alerts, 0) as active_alerts
        FROM properties p
        LEFT JOIN (
          SELECT 
            property_id,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
            COUNT(*) as total_count
          FROM property_checklists 
          GROUP BY property_id
        ) pc ON p.id = pc.property_id
        LEFT JOIN (
          SELECT property_id, COUNT(*) as camera_count
          FROM camera_feeds
          GROUP BY property_id
        ) cf ON p.id = cf.property_id
        LEFT JOIN (
          SELECT cf.property_id, COUNT(*) as active_alerts
          FROM video_alerts va
          JOIN camera_feeds cf ON va.camera_id = cf.id
          WHERE va.status = 'active'
          GROUP BY cf.property_id
        ) va ON p.id = va.property_id
        WHERE p.tenant_id = ?
        ORDER BY p.created_at DESC
      `, [tenantId]);

      return properties.rows;
    } catch (error) {
      throw new Error(`Failed to fetch properties with summary: ${error.message}`);
    }
  }
}

module.exports = PropertyService;
