const knex = require('../config/database');

class AnalyticsController {
  async dashboard(req, res) {
    try {
      const { facility_id, organization_id } = req.query;
      
      // Base query conditions
      const conditions = {};
      if (facility_id) conditions['facilities.id'] = facility_id;
      if (organization_id) conditions['facilities.organization_id'] = organization_id;

      // Get facility stats
      const facilityStats = await knex('facilities')
        .where(conditions)
        .leftJoin('units', 'facilities.id', 'units.facility_id')
        .select(
          knex.raw('COUNT(DISTINCT facilities.id) as total_facilities'),
          knex.raw('COUNT(units.id) as total_units'),
          knex.raw("COUNT(CASE WHEN units.status = 'occupied' THEN 1 END) as occupied_units"),
          knex.raw("COUNT(CASE WHEN units.status = 'available' THEN 1 END) as available_units"),
          knex.raw("COUNT(CASE WHEN units.status = 'maintenance' THEN 1 END) as maintenance_units")
        )
        .first();

      // Get revenue stats
      const revenueStats = await knex('contracts')
        .whereIn('unit_id', function() {
          this.select('units.id')
            .from('units')
            .leftJoin('facilities', 'units.facility_id', 'facilities.id')
            .where(conditions);
        })
        .where('contracts.status', 'active')
        .select(
          knex.raw('SUM(monthly_rate) as monthly_revenue'),
          knex.raw('COUNT(*) as active_contracts')
        )
        .first();

      // Get maintenance stats
      const maintenanceStats = await knex('maintenance_tickets')
        .whereIn('facility_id', function() {
          this.select('id').from('facilities').where(conditions);
        })
        .select(
          knex.raw("COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets"),
          knex.raw("COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets"),
          knex.raw("COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets")
        )
        .first();

      // Get recent alerts
      const recentAlerts = await knex('video_events')
        .whereIn('camera_id', function() {
          this.select('cameras.id')
            .from('cameras')
            .leftJoin('facilities', 'cameras.facility_id', 'facilities.id')
            .where(conditions);
        })
        .where('occurred_at', '>', knex.raw("NOW() - INTERVAL '24 hours'"))
        .count('* as count')
        .first();

      res.json({
        facilities: facilityStats,
        revenue: revenueStats,
        maintenance: maintenanceStats,
        alerts: {
          last_24_hours: parseInt(recentAlerts.count)
        },
        occupancy_rate: facilityStats.total_units > 0 
          ? ((facilityStats.occupied_units / facilityStats.total_units) * 100).toFixed(1)
          : 0
      });
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
  }

  async occupancy(req, res) {
    try {
      // TODO: Implement occupancy trends over time
      res.json({ message: 'Occupancy analytics endpoint' });
    } catch (error) {
      console.error('Error fetching occupancy analytics:', error);
      res.status(500).json({ error: 'Failed to fetch occupancy analytics' });
    }
  }

  async revenue(req, res) {
    try {
      // TODO: Implement revenue analytics
      res.json({ message: 'Revenue analytics endpoint' });
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
  }

  async maintenance(req, res) {
    try {
      // TODO: Implement maintenance analytics
      res.json({ message: 'Maintenance analytics endpoint' });
    } catch (error) {
      console.error('Error fetching maintenance analytics:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance analytics' });
    }
  }
}

module.exports = new AnalyticsController(); 