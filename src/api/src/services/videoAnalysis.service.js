const logger = require('../utils/logger');

class VideoAnalysisService {
  constructor(knex) {
    this.knex = knex;
  }

  // Camera Management
  async getCameras(tenantId, propertyId = null) {
    try {
      let query = this.knex('camera_feeds as cf')
        .select(
          'cf.*',
          'p.name as property_name',
          'p.address as property_address'
        )
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('p.tenant_id', tenantId)
        .orderBy('cf.created_at', 'desc');

      if (propertyId) {
        query = query.where('cf.property_id', propertyId);
      }

      const cameras = await query;
      
      // Get alert counts for each camera
      for (let camera of cameras) {
        const alertCount = await this.knex('video_alerts')
          .where('camera_id', camera.id)
          .where('status', 'active')
          .count('id as count')
          .first();
        camera.active_alerts = parseInt(alertCount.count);
      }

      return cameras;
    } catch (error) {
      logger.error('Error fetching cameras:', error);
      throw error;
    }
  }

  async getCameraById(id, tenantId) {
    try {
      const camera = await this.knex('camera_feeds as cf')
        .select(
          'cf.*',
          'p.name as property_name',
          'p.address as property_address'
        )
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('cf.id', id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!camera) {
        throw new Error('Camera not found');
      }

      return camera;
    } catch (error) {
      logger.error('Error fetching camera:', error);
      throw error;
    }
  }

  async createCamera(cameraData, tenantId) {
    try {
      const { property_id, name, rtsp_url, location, status = 'active' } = cameraData;

      // Verify property belongs to tenant
      const property = await this.knex('properties')
        .where('id', property_id)
        .where('tenant_id', tenantId)
        .first();

      if (!property) {
        throw new Error('Property not found');
      }

      const [camera] = await this.knex('camera_feeds')
        .insert({
          property_id,
          name,
          rtsp_url,
          location,
          status,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return await this.getCameraById(camera.id, tenantId);
    } catch (error) {
      logger.error('Error creating camera:', error);
      throw error;
    }
  }

  async updateCamera(id, cameraData, tenantId) {
    try {
      const { name, rtsp_url, location, status } = cameraData;

      // Verify camera exists and belongs to tenant
      await this.getCameraById(id, tenantId);

      const updateData = {
        updated_at: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (rtsp_url !== undefined) updateData.rtsp_url = rtsp_url;
      if (location !== undefined) updateData.location = location;
      if (status !== undefined) updateData.status = status;

      await this.knex('camera_feeds as cf')
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('cf.id', id)
        .where('p.tenant_id', tenantId)
        .update(updateData);

      return await this.getCameraById(id, tenantId);
    } catch (error) {
      logger.error('Error updating camera:', error);
      throw error;
    }
  }

  async deleteCamera(id, tenantId) {
    try {
      // Verify camera exists and belongs to tenant
      await this.getCameraById(id, tenantId);

      // Check for dependent alerts
      const alertCount = await this.knex('video_alerts')
        .where('camera_id', id)
        .count('id as count')
        .first();

      if (parseInt(alertCount.count) > 0) {
        throw new Error('Cannot delete camera with existing alerts');
      }

      const result = await this.knex('camera_feeds as cf')
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('cf.id', id)
        .where('p.tenant_id', tenantId)
        .del();

      if (result === 0) {
        throw new Error('Camera not found');
      }

      return { success: true, message: 'Camera deleted successfully' };
    } catch (error) {
      logger.error('Error deleting camera:', error);
      throw error;
    }
  }

  // Alert Management
  async getAlerts(tenantId, filters = {}) {
    try {
      let query = this.knex('video_alerts as va')
        .select(
          'va.*',
          'cf.name as camera_name',
          'cf.location as camera_location',
          'p.name as property_name',
          'at.name as alert_type_name',
          'at.severity_level'
        )
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('properties as p', 'cf.property_id', 'p.id')
        .join('alert_types as at', 'va.alert_type_id', 'at.id')
        .where('p.tenant_id', tenantId)
        .orderBy('va.created_at', 'desc');

      // Apply filters
      if (filters.status) {
        query = query.where('va.status', filters.status);
      }
      if (filters.property_id) {
        query = query.where('cf.property_id', filters.property_id);
      }
      if (filters.camera_id) {
        query = query.where('va.camera_id', filters.camera_id);
      }
      if (filters.severity_level) {
        query = query.where('at.severity_level', filters.severity_level);
      }
      if (filters.alert_type_id) {
        query = query.where('va.alert_type_id', filters.alert_type_id);
      }

      const alerts = await query;
      return alerts;
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      throw error;
    }
  }

  async getAlertById(id, tenantId) {
    try {
      const alert = await this.knex('video_alerts as va')
        .select(
          'va.*',
          'cf.name as camera_name',
          'cf.location as camera_location',
          'p.name as property_name',
          'at.name as alert_type_name',
          'at.severity_level'
        )
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('properties as p', 'cf.property_id', 'p.id')
        .join('alert_types as at', 'va.alert_type_id', 'at.id')
        .where('va.id', id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!alert) {
        throw new Error('Alert not found');
      }

      return alert;
    } catch (error) {
      logger.error('Error fetching alert:', error);
      throw error;
    }
  }

  async createAlert(alertData, tenantId) {
    const trx = await this.knex.transaction();
    
    try {
      const { camera_id, alert_type_id, confidence_score, metadata = {} } = alertData;

      // Verify camera belongs to tenant
      const camera = await trx('camera_feeds as cf')
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('cf.id', camera_id)
        .where('p.tenant_id', tenantId)
        .first();

      if (!camera) {
        throw new Error('Camera not found');
      }

      // Get alert type configuration
      const alertType = await trx('alert_types')
        .where('id', alert_type_id)
        .first();

      if (!alertType) {
        throw new Error('Alert type not found');
      }

      // Create alert
      const [alert] = await trx('video_alerts')
        .insert({
          camera_id,
          alert_type_id,
          alert_data_json: metadata,
          status: 'active',
          created_at: new Date()
        })
        .returning('*');

      // Auto-create service ticket if configured
      if (alertType.auto_create_ticket) {
        await this.createServiceTicketFromAlert(alert.id, tenantId, trx);
      }

      // Auto-create checklist if configured
      if (alertType.auto_create_checklist) {
        await this.createChecklistFromAlert(alert.id, tenantId, trx);
      }

      await trx.commit();
      return await this.getAlertById(alert.id, tenantId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId, userId, notes, tenantId) {
    try {
      // Verify alert exists and belongs to tenant
      await this.getAlertById(alertId, tenantId);

      const result = await this.knex('video_alerts as va')
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('va.id', alertId)
        .where('p.tenant_id', tenantId)
        .update({
          status: 'resolved',
          resolved_by: userId,
          resolved_at: new Date(),
          resolution_notes: notes
        });

      if (result === 0) {
        throw new Error('Alert not found');
      }

      return await this.getAlertById(alertId, tenantId);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  // Alert Types Management
  async getAlertTypes(tenantId) {
    try {
      const alertTypes = await this.knex('alert_types')
        .where('tenant_id', tenantId)
        .orderBy('name');

      return alertTypes;
    } catch (error) {
      logger.error('Error fetching alert types:', error);
      throw error;
    }
  }

  async createAlertType(alertTypeData, tenantId) {
    try {
      const { 
        name, 
        description, 
        severity_level, 
        color_code, 
        auto_create_ticket = false, 
        auto_create_checklist = false,
        config_json = {}
      } = alertTypeData;

      const [alertType] = await this.knex('alert_types')
        .insert({
          name,
          description,
          severity_level,
          color_code,
          auto_create_ticket,
          auto_create_checklist,
          config_json,
          tenant_id: tenantId,
          created_at: new Date()
        })
        .returning('*');

      return alertType;
    } catch (error) {
      logger.error('Error creating alert type:', error);
      throw error;
    }
  }

  // Service Ticket Management
  async getServiceTickets(tenantId, filters = {}) {
    try {
      let query = this.knex('service_tickets as st')
        .select(
          'st.*',
          'va.id as alert_id',
          'cf.name as camera_name',
          'p.name as property_name',
          'at.name as alert_type_name',
          'u.email as assigned_to_email'
        )
        .leftJoin('video_alerts as va', 'st.alert_id', 'va.id')
        .leftJoin('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .leftJoin('properties as p', 'cf.property_id', 'p.id')
        .leftJoin('alert_types as at', 'va.alert_type_id', 'at.id')
        .leftJoin('users as u', 'st.assigned_to', 'u.id')
        .where('p.tenant_id', tenantId)
        .orderBy('st.created_at', 'desc');

      // Apply filters
      if (filters.status) {
        query = query.where('st.status', filters.status);
      }
      if (filters.priority) {
        query = query.where('st.priority', filters.priority);
      }
      if (filters.assigned_to) {
        query = query.where('st.assigned_to', filters.assigned_to);
      }

      const tickets = await query;
      return tickets;
    } catch (error) {
      logger.error('Error fetching service tickets:', error);
      throw error;
    }
  }

  async createServiceTicket(ticketData, tenantId) {
    try {
      const { 
        alert_id, 
        title, 
        description, 
        priority = 'medium', 
        assigned_to 
      } = ticketData;

      // If alert_id provided, verify it belongs to tenant
      if (alert_id) {
        await this.getAlertById(alert_id, tenantId);
      }

      const [ticket] = await this.knex('service_tickets')
        .insert({
          alert_id,
          title,
          description,
          priority,
          assigned_to,
          status: 'open',
          created_at: new Date()
        })
        .returning('*');

      return ticket;
    } catch (error) {
      logger.error('Error creating service ticket:', error);
      throw error;
    }
  }

  // Helper Methods
  async createServiceTicketFromAlert(alertId, tenantId, trx = null) {
    const db = trx || this.knex;
    
    try {
      const alert = await db('video_alerts as va')
        .select(
          'va.*',
          'cf.name as camera_name',
          'cf.location as camera_location',
          'p.name as property_name',
          'at.name as alert_type_name'
        )
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('properties as p', 'cf.property_id', 'p.id')
        .join('alert_types as at', 'va.alert_type_id', 'at.id')
        .where('va.id', alertId)
        .where('p.tenant_id', tenantId)
        .first();

      if (!alert) {
        throw new Error('Alert not found for ticket creation');
      }

      const title = `${alert.alert_type_name} - ${alert.property_name}`;
      const description = `Auto-generated ticket from ${alert.alert_type_name} alert at ${alert.camera_name} (${alert.camera_location})`;

      await db('service_tickets')
        .insert({
          alert_id: alertId,
          title,
          description,
          priority: alert.severity_level === 'critical' ? 'high' : 'medium',
          status: 'open',
          created_at: new Date()
        });

      logger.info(`Auto-created service ticket for alert ${alertId}`);
    } catch (error) {
      logger.error('Error creating service ticket from alert:', error);
      throw error;
    }
  }

  async createChecklistFromAlert(alertId, tenantId, trx = null) {
    const db = trx || this.knex;
    
    try {
      const alert = await db('video_alerts as va')
        .select(
          'va.*',
          'cf.property_id',
          'at.name as alert_type_name'
        )
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('alert_types as at', 'va.alert_type_id', 'at.id')
        .where('va.id', alertId)
        .first();

      if (!alert) {
        throw new Error('Alert not found for checklist creation');
      }

      // Find appropriate checklist template (could be enhanced with more logic)
      const template = await db('checklist_templates')
        .where('tenant_id', tenantId)
        .where('name', 'like', '%Security%')
        .first();

      if (template) {
        const [checklist] = await db('property_checklists')
          .insert({
            property_id: alert.property_id,
            template_id: template.id,
            status: 'pending',
            created_at: new Date()
          })
          .returning('*');

        // Link alert to generated checklist
        await db('alert_generated_checklists')
          .insert({
            alert_id: alertId,
            checklist_id: checklist.id,
            created_at: new Date()
          });

        logger.info(`Auto-created checklist ${checklist.id} for alert ${alertId}`);
      }
    } catch (error) {
      logger.error('Error creating checklist from alert:', error);
      throw error;
    }
  }

  async getAlertStats(tenantId, propertyId = null) {
    try {
      let query = this.knex('video_alerts as va')
        .join('camera_feeds as cf', 'va.camera_id', 'cf.id')
        .join('properties as p', 'cf.property_id', 'p.id')
        .where('p.tenant_id', tenantId);

      if (propertyId) {
        query = query.where('cf.property_id', propertyId);
      }

      const stats = await query
        .select(
          this.knex.raw('COUNT(*) as total_alerts'),
          this.knex.raw("COUNT(CASE WHEN va.status = 'active' THEN 1 END) as active_alerts"),
          this.knex.raw("COUNT(CASE WHEN va.status = 'resolved' THEN 1 END) as resolved_alerts"),
          this.knex.raw("COUNT(CASE WHEN DATE(va.created_at) = CURRENT_DATE THEN 1 END) as today_alerts")
        )
        .first();

      return {
        total_alerts: parseInt(stats.total_alerts),
        active_alerts: parseInt(stats.active_alerts),
        resolved_alerts: parseInt(stats.resolved_alerts),
        today_alerts: parseInt(stats.today_alerts)
      };
    } catch (error) {
      logger.error('Error calculating alert stats:', error);
      return {
        total_alerts: 0,
        active_alerts: 0,
        resolved_alerts: 0,
        today_alerts: 0
      };
    }
  }
}

module.exports = VideoAnalysisService;
