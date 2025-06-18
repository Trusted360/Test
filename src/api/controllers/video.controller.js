const knex = require('../config/database');

// Camera Management
exports.getCameras = async (req, res) => {
  try {
    const { property_id } = req.query;
    let query = knex('camera_feeds as c')
      .leftJoin('properties as p', 'c.property_id', 'p.id')
      .leftJoin('video_alerts as va', function() {
        this.on('va.camera_id', '=', 'c.id')
          .andOn('va.status', '=', knex.raw('?', ['active']));
      })
      .select(
        'c.*',
        'p.name as property_name',
        'p.address as property_address',
        knex.raw('COUNT(DISTINCT va.id) as active_alerts')
      )
      .groupBy('c.id', 'p.id', 'p.name', 'p.address');

    if (property_id) {
      query = query.where('c.property_id', property_id);
    }

    const cameras = await query;
    
    res.json({
      success: true,
      data: cameras,
      count: cameras.length
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch cameras',
      error: error.message 
    });
  }
};

exports.getCameraById = async (req, res) => {
  try {
    const { id } = req.params;
    const camera = await knex('camera_feeds as c')
      .leftJoin('properties as p', 'c.property_id', 'p.id')
      .where('c.id', id)
      .select('c.*', 'p.name as property_name', 'p.address as property_address')
      .first();

    if (!camera) {
      return res.status(404).json({ 
        success: false,
        message: 'Camera not found' 
      });
    }

    res.json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch camera',
      error: error.message 
    });
  }
};

exports.createCamera = async (req, res) => {
  try {
    const cameraData = req.body;
    const [camera] = await knex('camera_feeds')
      .insert(cameraData)
      .returning('*');

    res.status(201).json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('Error creating camera:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create camera',
      error: error.message 
    });
  }
};

exports.updateCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [camera] = await knex('camera_feeds')
      .where('id', id)
      .update(updates)
      .returning('*');

    if (!camera) {
      return res.status(404).json({ 
        success: false,
        message: 'Camera not found' 
      });
    }

    res.json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update camera',
      error: error.message 
    });
  }
};

exports.deleteCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await knex('camera_feeds')
      .where('id', id)
      .delete();

    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Camera not found' 
      });
    }

    res.json({
      success: true,
      message: 'Camera deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete camera',
      error: error.message 
    });
  }
};

// Alert Management
exports.getAlerts = async (req, res) => {
  try {
    const { status, severity, camera_id, property_id, limit = 50, offset = 0 } = req.query;
    
    let query = knex('video_alerts as va')
      .leftJoin('camera_feeds as c', 'va.camera_id', 'c.id')
      .leftJoin('properties as p', 'c.property_id', 'p.id')
      .leftJoin('alert_types as vat', 'va.alert_type_id', 'vat.id')
      .select(
        'va.*',
        'c.name as camera_name',
        'p.name as property_name',
        'vat.name as alert_type_name',
        'vat.severity_level'
      )
      .orderBy('va.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) query = query.where('va.status', status);
    if (severity) query = query.where('va.severity', severity);
    if (camera_id) query = query.where('va.camera_id', camera_id);
    if (property_id) query = query.where('c.property_id', property_id);

    const alerts = await query;
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message 
    });
  }
};

exports.getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await knex('video_alerts as va')
      .leftJoin('camera_feeds as c', 'va.camera_id', 'c.id')
      .leftJoin('properties as p', 'c.property_id', 'p.id')
      .leftJoin('alert_types as vat', 'va.alert_type_id', 'vat.id')
      .where('va.id', id)
      .select(
        'va.*',
        'c.name as camera_name',
        'p.name as property_name',
        'vat.name as alert_type_name',
        'vat.severity_level'
      )
      .first();

    if (!alert) {
      return res.status(404).json({ 
        success: false,
        message: 'Alert not found' 
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch alert',
      error: error.message 
    });
  }
};

exports.createAlert = async (req, res) => {
  try {
    const alertData = req.body;
    const [alert] = await knex('video_alerts')
      .insert({
        ...alertData,
        created_at: new Date()
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create alert',
      error: error.message 
    });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const [alert] = await knex('video_alerts')
      .where('id', id)
      .update({
        status: 'resolved',
        resolved_at: new Date(),
        resolution_notes: notes
      })
      .returning('*');

    if (!alert) {
      return res.status(404).json({ 
        success: false,
        message: 'Alert not found' 
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to resolve alert',
      error: error.message 
    });
  }
};

// Alert Types
exports.getAlertTypes = async (req, res) => {
  try {
    const alertTypes = await knex('alert_types')
      .where('is_active', true)
      .orderBy('name');

    res.json({
      success: true,
      data: alertTypes,
      count: alertTypes.length
    });
  } catch (error) {
    console.error('Error fetching alert types:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch alert types',
      error: error.message 
    });
  }
};

exports.createAlertType = async (req, res) => {
  try {
    const alertTypeData = req.body;
    const [alertType] = await knex('alert_types')
      .insert(alertTypeData)
      .returning('*');

    res.status(201).json({
      success: true,
      data: alertType
    });
  } catch (error) {
    console.error('Error creating alert type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create alert type',
      error: error.message 
    });
  }
};

// Service Tickets
exports.getServiceTickets = async (req, res) => {
  try {
    const { status, priority, property_id, limit = 50, offset = 0 } = req.query;
    
    let query = knex('service_tickets as vst')
      .leftJoin('properties as p', 'vst.property_id', 'p.id')
      .leftJoin('video_alerts as va', 'vst.alert_id', 'va.id')
      .leftJoin('camera_feeds as c', 'va.camera_id', 'c.id')
      .leftJoin('alert_types as vat', 'va.alert_type_id', 'vat.id')
      .select(
        'vst.*',
        'p.name as property_name',
        'c.name as camera_name',
        'vat.name as alert_type_name'
      )
      .orderBy('vst.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) query = query.where('vst.status', status);
    if (priority) query = query.where('vst.priority', priority);
    if (property_id) query = query.where('vst.property_id', property_id);

    const tickets = await query;
    
    res.json({
      success: true,
      data: tickets,
      count: tickets.length
    });
  } catch (error) {
    console.error('Error fetching service tickets:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch service tickets',
      error: error.message 
    });
  }
};

exports.createServiceTicket = async (req, res) => {
  try {
    const ticketData = req.body;
    const [ticket] = await knex('service_tickets')
      .insert({
        ...ticketData,
        status: 'open',
        created_at: new Date()
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error creating service ticket:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create service ticket',
      error: error.message 
    });
  }
};

// Statistics
exports.getStats = async (req, res) => {
  try {
    const { property_id } = req.query;
    
    let baseQuery = knex('video_alerts as va')
      .leftJoin('camera_feeds as c', 'va.camera_id', 'c.id');
    
    if (property_id) {
      baseQuery = baseQuery.where('c.property_id', property_id);
    }

    const [stats] = await baseQuery
      .select(
        knex.raw('COUNT(*) as total_alerts'),
        knex.raw('COUNT(CASE WHEN va.status = ? THEN 1 END) as active_alerts', ['active']),
        knex.raw('COUNT(CASE WHEN va.status = ? THEN 1 END) as resolved_alerts', ['resolved']),
        knex.raw('COUNT(CASE WHEN DATE(va.created_at) = CURRENT_DATE THEN 1 END) as alerts_today')
      );

    res.json({
      success: true,
      data: {
        total_alerts: parseInt(stats.total_alerts) || 0,
        active_alerts: parseInt(stats.active_alerts) || 0,
        resolved_alerts: parseInt(stats.resolved_alerts) || 0,
        alerts_today: parseInt(stats.alerts_today) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message 
    });
  }
};

// Property-specific endpoints
exports.getCamerasForProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const cameras = await knex('camera_feeds')
      .where('property_id', propertyId)
      .orderBy('name');

    res.json({
      success: true,
      data: cameras,
      count: cameras.length
    });
  } catch (error) {
    console.error('Error fetching property cameras:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch property cameras',
      error: error.message 
    });
  }
};

exports.getAlertsForProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const alerts = await knex('video_alerts as va')
      .leftJoin('camera_feeds as c', 'va.camera_id', 'c.id')
      .leftJoin('alert_types as vat', 'va.alert_type_id', 'vat.id')
      .where('c.property_id', propertyId)
      .select(
        'va.*',
        'c.name as camera_name',
        'vat.name as alert_type_name',
        'vat.severity_level'
      )
      .orderBy('va.created_at', 'desc');

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching property alerts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch property alerts',
      error: error.message 
    });
  }
};

// Demo/Testing
exports.generateDemoAlert = async (req, res) => {
  try {
    // Get a random camera
    const camera = await knex('camera_feeds')
      .where('status', 'active')
      .orderByRaw('RANDOM()')
      .first();

    if (!camera) {
      return res.status(400).json({ 
        success: false,
        message: 'No active cameras found' 
      });
    }

    // Get a random alert type
    const alertType = await knex('alert_types')
      .where('is_active', true)
      .orderByRaw('RANDOM()')
      .first();

    if (!alertType) {
      return res.status(400).json({ 
        success: false,
        message: 'No active alert types found' 
      });
    }

    // Create demo alert
    const [alert] = await knex('video_alerts')
      .insert({
        camera_id: camera.id,
        alert_type_id: alertType.id,
        severity: alertType.severity_level,
        status: 'active',
        alert_data_json: {
          demo: true,
          generated_at: new Date(),
          description: `Demo ${alertType.name} alert for testing`
        },
        created_at: new Date()
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Demo alert generated successfully'
    });
  } catch (error) {
    console.error('Error generating demo alert:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate demo alert',
      error: error.message 
    });
  }
};

// Legacy video event processing (kept for compatibility)
exports.processEvent = async (req, res) => {
  try {
    const { camera_id, event_type, metadata, video_clip_url, occurred_at } = req.body;
    
    // Save video event to database
    const [event] = await knex('video_events')
      .insert({
        camera_id,
        event_type,
        metadata,
        video_clip_url,
        occurred_at: occurred_at || new Date()
      })
      .returning('*');
    
    // TODO: Trigger notifications based on event type
    
    res.status(201).json({ 
      success: true,
      data: event 
    });
  } catch (error) {
    console.error('Error processing video event:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process video event',
      error: error.message 
    });
  }
};
