const NotificationService = require('../services/notification.service');
const logger = require('../utils/logger');

/**
 * Notification controller
 */
class NotificationController {
  /**
   * Create a new notification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async createNotification(req, res) {
    try {
      const { tenantId } = req.user;
      const notificationData = {
        ...req.body,
        tenantId
      };

      const notification = await NotificationService.createNotification(notificationData);
      
      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message
      });
    }
  }

  /**
   * Create a notification from a template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async createFromTemplate(req, res) {
    try {
      const { tenantId } = req.user;
      const templateData = {
        ...req.body,
        tenantId
      };

      const notification = await NotificationService.createFromTemplate(templateData);
      
      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error('Error creating notification from template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification from template',
        error: error.message
      });
    }
  }

  /**
   * Get notifications for a recipient
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async getNotifications(req, res) {
    try {
      const { tenantId } = req.user;
      const { recipientType, recipientId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const notifications = await NotificationService.getNotificationsForRecipient(
        recipientType,
        recipientId,
        tenantId,
        { limit: parseInt(limit, 10), offset: parseInt(offset, 10) }
      );
      
      res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: error.message
      });
    }
  }

  /**
   * Get unread notification count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async getUnreadCount(req, res) {
    try {
      const { tenantId } = req.user;
      const { recipientType, recipientId } = req.params;

      const count = await NotificationService.getUnreadCount(
        recipientType,
        recipientId,
        tenantId
      );
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  }

  /**
   * Mark a notification as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async markAsRead(req, res) {
    try {
      const { tenantId } = req.user;
      const { recipientId } = req.params;

      const result = await NotificationService.markAsRead(recipientId, tenantId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Notification recipient not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async markAllAsRead(req, res) {
    try {
      const { tenantId } = req.user;
      const { recipientType, recipientId } = req.params;

      const count = await NotificationService.markAllAsRead(
        recipientType,
        recipientId,
        tenantId
      );
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  }

  /**
   * Create a notification channel
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async createChannel(req, res) {
    try {
      const { tenantId } = req.user;
      const channelData = {
        ...req.body,
        tenantId
      };

      const channel = await NotificationService.createChannel(channelData);
      
      res.status(201).json({
        success: true,
        data: channel
      });
    } catch (error) {
      logger.error('Error creating notification channel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification channel',
        error: error.message
      });
    }
  }

  /**
   * Get notification channels
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async getChannels(req, res) {
    try {
      const { tenantId } = req.user;
      const { type } = req.query;

      let channels;
      if (type) {
        channels = await NotificationChannel.getByType(type, tenantId);
      } else {
        channels = await NotificationChannel.getAll(tenantId);
      }
      
      res.status(200).json({
        success: true,
        data: channels
      });
    } catch (error) {
      logger.error('Error getting notification channels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification channels',
        error: error.message
      });
    }
  }

  /**
   * Create a notification template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async createTemplate(req, res) {
    try {
      const { tenantId } = req.user;
      const templateData = {
        ...req.body,
        tenantId
      };

      const template = await NotificationService.createTemplate(templateData);
      
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error creating notification template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification template',
        error: error.message
      });
    }
  }

  /**
   * Get notification templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async getTemplates(req, res) {
    try {
      const { tenantId } = req.user;
      const { type } = req.query;

      let templates;
      if (type) {
        templates = await NotificationTemplate.getByType(type, tenantId);
      } else {
        templates = await NotificationTemplate.getAll(tenantId);
      }
      
      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error getting notification templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification templates',
        error: error.message
      });
    }
  }

  /**
   * Set notification preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async setPreferences(req, res) {
    try {
      const { tenantId } = req.user;
      const preferenceData = {
        ...req.body,
        tenantId
      };

      const preference = await NotificationService.setPreferences(preferenceData);
      
      res.status(200).json({
        success: true,
        data: preference
      });
    } catch (error) {
      logger.error('Error setting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set notification preferences',
        error: error.message
      });
    }
  }

  /**
   * Get notification preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async getPreferences(req, res) {
    try {
      const { tenantId } = req.user;
      const { entityType, entityId } = req.params;

      const preferences = await NotificationPreference.getByEntity(
        entityType,
        entityId,
        tenantId
      );
      
      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
        error: error.message
      });
    }
  }

  /**
   * Process scheduled notifications (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async processScheduledNotifications(req, res) {
    try {
      const { tenantId } = req.user;

      const count = await NotificationService.processScheduledNotifications(tenantId);
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process scheduled notifications',
        error: error.message
      });
    }
  }

  /**
   * Process pending delivery retries (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async processPendingRetries(req, res) {
    try {
      const { tenantId } = req.user;

      const count = await NotificationService.processPendingRetries(tenantId);
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Error processing pending retries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process pending retries',
        error: error.message
      });
    }
  }
}

module.exports = NotificationController;
