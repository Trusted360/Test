const db = require('../config/database');

const settingsController = {
  // Global Settings
  async getGlobalSettings(req, res) {
    try {
      const { category } = req.query;
      const tenantId = req.user?.tenant_id || 'default';
      
      let query = db('global_settings')
        .where('tenant_id', tenantId)
        .select('setting_key', 'setting_value', 'setting_type', 'description', 'category');
      
      if (category) {
        query = query.where('category', category);
      }
      
      const settings = await query;
      
      // Convert settings to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        let value = setting.setting_value;
        
        // Parse based on type
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(value);
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.warn(`Failed to parse JSON setting ${setting.setting_key}:`, e);
          }
        }
        
        settingsObj[setting.setting_key] = {
          value,
          type: setting.setting_type,
          description: setting.description,
          category: setting.category
        };
      });
      
      res.json(settingsObj);
    } catch (error) {
      console.error('Error fetching global settings:', error);
      res.status(500).json({ error: 'Failed to fetch global settings' });
    }
  },

  async updateGlobalSettings(req, res) {
    try {
      const { settings } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
      }
      
      const trx = await db.transaction();
      
      try {
        for (const [key, settingData] of Object.entries(settings)) {
          let value = settingData.value;
          const type = settingData.type || 'string';
          
          // Convert value to string for storage
          if (type === 'json') {
            value = JSON.stringify(value);
          } else if (type === 'boolean') {
            value = value.toString();
          } else if (type === 'number') {
            value = value.toString();
          }
          
          await trx('global_settings')
            .insert({
              setting_key: key,
              setting_value: value,
              setting_type: type,
              description: settingData.description,
              category: settingData.category || 'general',
              tenant_id: tenantId
            })
            .onConflict('setting_key')
            .merge(['setting_value', 'setting_type', 'description', 'category', 'updated_at']);
        }
        
        await trx.commit();
        res.json({ message: 'Global settings updated successfully' });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating global settings:', error);
      res.status(500).json({ error: 'Failed to update global settings' });
    }
  },

  // User Settings
  async getUserSettings(req, res) {
    try {
      const userId = req.user.id;
      
      const settings = await db('user_settings')
        .where('user_id', userId)
        .select('setting_key', 'setting_value', 'setting_type');
      
      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        let value = setting.setting_value;
        
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(value);
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.warn(`Failed to parse JSON user setting ${setting.setting_key}:`, e);
          }
        }
        
        settingsObj[setting.setting_key] = value;
      });
      
      res.json(settingsObj);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  },

  async updateUserSettings(req, res) {
    try {
      const { settings } = req.body;
      const userId = req.user.id;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
      }
      
      const trx = await db.transaction();
      
      try {
        for (const [key, value] of Object.entries(settings)) {
          let settingValue = value;
          let settingType = 'string';
          
          // Determine type and convert value
          if (typeof value === 'boolean') {
            settingType = 'boolean';
            settingValue = value.toString();
          } else if (typeof value === 'number') {
            settingType = 'number';
            settingValue = value.toString();
          } else if (typeof value === 'object') {
            settingType = 'json';
            settingValue = JSON.stringify(value);
          }
          
          await trx('user_settings')
            .insert({
              user_id: userId,
              setting_key: key,
              setting_value: settingValue,
              setting_type: settingType
            })
            .onConflict(['user_id', 'setting_key'])
            .merge(['setting_value', 'setting_type', 'updated_at']);
        }
        
        await trx.commit();
        res.json({ message: 'User settings updated successfully' });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: 'Failed to update user settings' });
    }
  },

  // Notification Targets
  async getNotificationTargets(req, res) {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      const targets = await db('notification_targets')
        .where('tenant_id', tenantId)
        .select('id', 'name', 'type', 'target_address', 'config_json', 'is_active', 'created_at')
        .orderBy('name');
      
      res.json(targets);
    } catch (error) {
      console.error('Error fetching notification targets:', error);
      res.status(500).json({ error: 'Failed to fetch notification targets' });
    }
  },

  async createNotificationTarget(req, res) {
    try {
      const { name, type, target_address, config_json } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      const createdBy = req.user.id;
      
      if (!name || !type || !target_address) {
        return res.status(400).json({ error: 'Name, type, and target address are required' });
      }
      
      const [targetId] = await db('notification_targets')
        .insert({
          name,
          type,
          target_address,
          config_json: config_json ? JSON.stringify(config_json) : null,
          created_by: createdBy,
          tenant_id: tenantId
        })
        .returning('id');
      
      const target = await db('notification_targets')
        .where('id', targetId)
        .first();
      
      res.status(201).json(target);
    } catch (error) {
      console.error('Error creating notification target:', error);
      res.status(500).json({ error: 'Failed to create notification target' });
    }
  },

  async updateNotificationTarget(req, res) {
    try {
      const { id } = req.params;
      const { name, type, target_address, config_json, is_active } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (target_address !== undefined) updateData.target_address = target_address;
      if (config_json !== undefined) updateData.config_json = JSON.stringify(config_json);
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const updated = await db('notification_targets')
        .where({ id, tenant_id: tenantId })
        .update(updateData)
        .returning('*');
      
      if (updated.length === 0) {
        return res.status(404).json({ error: 'Notification target not found' });
      }
      
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating notification target:', error);
      res.status(500).json({ error: 'Failed to update notification target' });
    }
  },

  async deleteNotificationTarget(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || 'default';
      
      const deleted = await db('notification_targets')
        .where({ id, tenant_id: tenantId })
        .del();
      
      if (deleted === 0) {
        return res.status(404).json({ error: 'Notification target not found' });
      }
      
      res.json({ message: 'Notification target deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification target:', error);
      res.status(500).json({ error: 'Failed to delete notification target' });
    }
  },

  // Service Integrations
  async getServiceIntegrations(req, res) {
    try {
      const tenantId = req.user?.tenant_id || 'default';
      
      const integrations = await db('service_integrations')
        .where('tenant_id', tenantId)
        .select('id', 'name', 'integration_type', 'base_url', 'username', 'config_json', 'is_active', 'auto_create_tickets', 'default_project_key', 'default_issue_type', 'created_at')
        .orderBy('name');
      
      res.json(integrations);
    } catch (error) {
      console.error('Error fetching service integrations:', error);
      res.status(500).json({ error: 'Failed to fetch service integrations' });
    }
  },

  async createServiceIntegration(req, res) {
    try {
      const { name, integration_type, base_url, api_key, username, config_json, auto_create_tickets, default_project_key, default_issue_type } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      if (!name || !integration_type || !base_url) {
        return res.status(400).json({ error: 'Name, integration type, and base URL are required' });
      }
      
      const [integrationId] = await db('service_integrations')
        .insert({
          name,
          integration_type,
          base_url,
          api_key, // TODO: Encrypt this
          username,
          config_json: config_json ? JSON.stringify(config_json) : null,
          auto_create_tickets: auto_create_tickets || false,
          default_project_key,
          default_issue_type,
          tenant_id: tenantId
        })
        .returning('id');
      
      const integration = await db('service_integrations')
        .where('id', integrationId)
        .select('id', 'name', 'integration_type', 'base_url', 'username', 'config_json', 'is_active', 'auto_create_tickets', 'default_project_key', 'default_issue_type', 'created_at')
        .first();
      
      res.status(201).json(integration);
    } catch (error) {
      console.error('Error creating service integration:', error);
      res.status(500).json({ error: 'Failed to create service integration' });
    }
  },

  async updateServiceIntegration(req, res) {
    try {
      const { id } = req.params;
      const { name, integration_type, base_url, api_key, username, config_json, is_active, auto_create_tickets, default_project_key, default_issue_type } = req.body;
      const tenantId = req.user?.tenant_id || 'default';
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (integration_type !== undefined) updateData.integration_type = integration_type;
      if (base_url !== undefined) updateData.base_url = base_url;
      if (api_key !== undefined) updateData.api_key = api_key; // TODO: Encrypt this
      if (username !== undefined) updateData.username = username;
      if (config_json !== undefined) updateData.config_json = JSON.stringify(config_json);
      if (is_active !== undefined) updateData.is_active = is_active;
      if (auto_create_tickets !== undefined) updateData.auto_create_tickets = auto_create_tickets;
      if (default_project_key !== undefined) updateData.default_project_key = default_project_key;
      if (default_issue_type !== undefined) updateData.default_issue_type = default_issue_type;
      
      const updated = await db('service_integrations')
        .where({ id, tenant_id: tenantId })
        .update(updateData)
        .returning(['id', 'name', 'integration_type', 'base_url', 'username', 'config_json', 'is_active', 'auto_create_tickets', 'default_project_key', 'default_issue_type', 'created_at']);
      
      if (updated.length === 0) {
        return res.status(404).json({ error: 'Service integration not found' });
      }
      
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating service integration:', error);
      res.status(500).json({ error: 'Failed to update service integration' });
    }
  },

  async deleteServiceIntegration(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || 'default';
      
      const deleted = await db('service_integrations')
        .where({ id, tenant_id: tenantId })
        .del();
      
      if (deleted === 0) {
        return res.status(404).json({ error: 'Service integration not found' });
      }
      
      res.json({ message: 'Service integration deleted successfully' });
    } catch (error) {
      console.error('Error deleting service integration:', error);
      res.status(500).json({ error: 'Failed to delete service integration' });
    }
  },

  // Camera Feed Settings
  async getCameraFeedSettings(req, res) {
    try {
      const { propertyId } = req.query;
      
      let query = db('camera_feed_settings as cfs')
        .join('camera_feeds as cf', 'cfs.camera_feed_id', 'cf.id')
        .leftJoin('properties as p', 'cfs.property_id', 'p.id')
        .select(
          'cfs.*',
          'cf.name as camera_name',
          'cf.feed_url',
          'cf.location',
          'cf.status as camera_status',
          'p.name as property_name'
        );
      
      if (propertyId) {
        query = query.where('cfs.property_id', propertyId);
      }
      
      const settings = await query.orderBy('cf.name');
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching camera feed settings:', error);
      res.status(500).json({ error: 'Failed to fetch camera feed settings' });
    }
  },

  async updateCameraFeedSettings(req, res) {
    try {
      const { cameraFeedId } = req.params;
      const { 
        property_id, 
        alert_rules, 
        recording_settings, 
        notification_settings,
        motion_detection_enabled,
        person_detection_enabled,
        vehicle_detection_enabled,
        sensitivity_level
      } = req.body;
      
      const updateData = {};
      if (property_id !== undefined) updateData.property_id = property_id;
      if (alert_rules !== undefined) updateData.alert_rules = JSON.stringify(alert_rules);
      if (recording_settings !== undefined) updateData.recording_settings = JSON.stringify(recording_settings);
      if (notification_settings !== undefined) updateData.notification_settings = JSON.stringify(notification_settings);
      if (motion_detection_enabled !== undefined) updateData.motion_detection_enabled = motion_detection_enabled;
      if (person_detection_enabled !== undefined) updateData.person_detection_enabled = person_detection_enabled;
      if (vehicle_detection_enabled !== undefined) updateData.vehicle_detection_enabled = vehicle_detection_enabled;
      if (sensitivity_level !== undefined) updateData.sensitivity_level = sensitivity_level;
      
      const existing = await db('camera_feed_settings')
        .where('camera_feed_id', cameraFeedId)
        .first();
      
      let result;
      if (existing) {
        result = await db('camera_feed_settings')
          .where('camera_feed_id', cameraFeedId)
          .update(updateData)
          .returning('*');
      } else {
        result = await db('camera_feed_settings')
          .insert({
            camera_feed_id: cameraFeedId,
            ...updateData
          })
          .returning('*');
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error updating camera feed settings:', error);
      res.status(500).json({ error: 'Failed to update camera feed settings' });
    }
  }
};

module.exports = settingsController;
