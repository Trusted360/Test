const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * UserActivity model for tracking user activities
 */
class UserActivity {
  constructor(db) {
    this.db = db;
    this.tableName = 'user_activities';
  }

  /**
   * Log a user activity
   * @param {Object} activityData - Activity data
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Created activity
   */
  async logActivity(activityData, tenantId) {
    try {
      const { userId, activityType, resourceType, resourceId, details, ipAddress, userAgent } = activityData;
      
      const now = new Date();
      
      const activity = {
        user_id: userId,
        tenant_id: tenantId || 'default',
        activity_type: activityType,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.stringify(details) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: now,
        updated_at: now
      };
      
      const [insertedId] = await this.db(this.tableName).insert(activity).returning('id');
      
      return { ...activity, id: insertedId };
    } catch (error) {
      logger.error(`Error logging user activity: ${error.message}`);
      
      // Don't throw error for activity logging failures
      // Just log the error and return null
      return null;
    }
  }

  /**
   * Get user activities
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Array} Activities
   */
  async getUserActivities(userId, tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        activityTypes, 
        resourceTypes,
        startDate,
        endDate,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;
      
      const offset = (page - 1) * limit;
      
      const query = this.db(this.tableName)
        .where({ user_id: userId, tenant_id: tenantId });
      
      // Apply filters
      if (activityTypes && activityTypes.length > 0) {
        query.whereIn('activity_type', activityTypes);
      }
      
      if (resourceTypes && resourceTypes.length > 0) {
        query.whereIn('resource_type', resourceTypes);
      }
      
      if (startDate) {
        query.where('created_at', '>=', startDate);
      }
      
      if (endDate) {
        query.where('created_at', '<=', endDate);
      }
      
      // Get total count
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('id as count').first();
      const total = totalResult ? parseInt(totalResult.count) : 0;
      
      // Apply pagination and sorting
      query.orderBy(sortBy, sortOrder);
      query.limit(limit).offset(offset);
      
      const activities = await query;
      
      return {
        data: activities,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting user activities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent activities for dashboard
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Number of activities to return
   * @returns {Array} Recent activities
   */
  async getRecentActivities(userId, tenantId, limit = 5) {
    try {
      return this.db(this.tableName)
        .where({ user_id: userId, tenant_id: tenantId })
        .orderBy('created_at', 'desc')
        .limit(limit);
    } catch (error) {
      logger.error(`Error getting recent activities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {number} days - Number of days to include
   * @returns {Object} Activity statistics
   */
  async getActivityStatistics(userId, tenantId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get activity counts by type
      const activitiesByType = await this.db(this.tableName)
        .where({ user_id: userId, tenant_id: tenantId })
        .where('created_at', '>=', startDate)
        .select('activity_type')
        .count('* as count')
        .groupBy('activity_type');
      
      // Get activity counts by day
      const activitiesByDay = await this.db(this.tableName)
        .where({ user_id: userId, tenant_id: tenantId })
        .where('created_at', '>=', startDate)
        .select(this.db.raw('DATE(created_at) as date'))
        .count('* as count')
        .groupBy('date')
        .orderBy('date');
      
      return {
        byType: activitiesByType.reduce((acc, item) => {
          acc[item.activity_type] = parseInt(item.count);
          return acc;
        }, {}),
        byDay: activitiesByDay
      };
    } catch (error) {
      logger.error(`Error getting activity statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete old activities
   * @param {string} tenantId - Tenant ID
   * @param {number} days - Delete activities older than this many days
   * @returns {number} Number of deleted activities
   */
  async deleteOldActivities(tenantId, days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return this.db(this.tableName)
        .where({ tenant_id: tenantId })
        .where('created_at', '<', cutoffDate)
        .delete();
    } catch (error) {
      logger.error(`Error deleting old activities: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserActivity; 