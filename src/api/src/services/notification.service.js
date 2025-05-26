const logger = require('../utils/logger');
const { 
  Notification, 
  NotificationRecipient, 
  NotificationChannel, 
  NotificationDelivery,
  NotificationTemplate,
  NotificationPreference
} = require('../models');
const redis = require('./redis');

/**
 * Notification service
 * 
 * Handles the creation, delivery, and management of notifications
 */
class NotificationService {
  /**
   * Create a new notification
   * @param {Object} data - Notification data
   * @param {string} data.type - Notification type
   * @param {string} data.title - Notification title
   * @param {string} data.body - Notification body
   * @param {Object} data.data - Additional notification data (optional)
   * @param {string} data.status - Notification status (default: 'pending')
   * @param {Date} data.scheduledFor - When to deliver the notification (optional)
   * @param {Date} data.expiresAt - When the notification expires (optional)
   * @param {string} data.priority - Notification priority (default: 'medium')
   * @param {string} data.recipientType - Recipient type (household, member)
   * @param {string} data.recipientId - Recipient ID
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification with recipient
   */
  static async createNotification(data) {
    try {
      const { 
        type, 
        title, 
        body, 
        data: notificationData = {}, 
        status = 'pending',
        scheduledFor = null,
        expiresAt = null,
        priority = 'medium',
        recipientType, 
        recipientId, 
        tenantId 
      } = data;

      // Check if notifications are enabled for this recipient and type
      const enabled = await NotificationPreference.isEnabled(
        recipientType, 
        recipientId, 
        type, 
        tenantId
      );

      if (!enabled) {
        logger.info(`Notifications disabled for ${recipientType}:${recipientId} and type ${type}`);
        return null;
      }

      // Create notification
      const notification = await Notification.create({
        type,
        title,
        body,
        data: notificationData,
        status,
        scheduledFor,
        expiresAt,
        priority,
        tenantId
      });

      // Create notification recipient
      const recipient = await NotificationRecipient.create({
        notificationId: notification.id,
        recipientType,
        recipientId,
        status: 'pending',
        tenantId
      });

      // If notification is not scheduled for later, deliver it immediately
      if (!scheduledFor || scheduledFor <= new Date()) {
        await this.deliverNotification(notification.id, tenantId);
      }

      // Log notification creation
      logger.info(`Created notification ${notification.id} of type ${type} for ${recipientType}:${recipientId}`);

      // Return notification with recipient
      return {
        ...notification,
        recipient
      };
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification from a template
   * @param {Object} data - Notification data
   * @param {string} data.templateName - Template name
   * @param {Object} data.templateData - Data to render the template with
   * @param {string} data.recipientType - Recipient type (household, member)
   * @param {string} data.recipientId - Recipient ID
   * @param {string} data.status - Notification status (default: 'pending')
   * @param {Date} data.scheduledFor - When to deliver the notification (optional)
   * @param {Date} data.expiresAt - When the notification expires (optional)
   * @param {string} data.priority - Notification priority (default: 'medium')
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created notification with recipient
   */
  static async createFromTemplate(data) {
    try {
      const {
        templateName,
        templateData,
        recipientType,
        recipientId,
        status = 'pending',
        scheduledFor = null,
        expiresAt = null,
        priority = 'medium',
        tenantId
      } = data;

      // Get template
      const template = await NotificationTemplate.getByName(templateName, tenantId);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Render template
      const rendered = NotificationTemplate.renderTemplate(template, templateData);

      // Create notification
      return this.createNotification({
        type: template.type,
        title: rendered.title,
        body: rendered.body,
        data: rendered.data,
        status,
        scheduledFor,
        expiresAt,
        priority,
        recipientType,
        recipientId,
        tenantId
      });
    } catch (error) {
      logger.error('Error creating notification from template:', error);
      throw error;
    }
  }

  /**
   * Deliver a notification to all appropriate channels
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Delivery results
   */
  static async deliverNotification(notificationId, tenantId) {
    try {
      // Get notification
      const notification = await Notification.getById(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // Get recipients
      const recipients = await NotificationRecipient.getByNotificationId(notificationId, tenantId);
      if (!recipients || recipients.length === 0) {
        throw new Error(`No recipients found for notification ${notificationId}`);
      }

      // Get active channels
      const channels = await NotificationChannel.getActive(tenantId);
      if (!channels || channels.length === 0) {
        logger.warn(`No active channels found for tenant ${tenantId}`);
        return [];
      }

      const deliveryResults = [];

      // For each recipient, deliver to appropriate channels
      for (const recipient of recipients) {
        // Get channel preferences for this recipient and notification type
        const channelPreferences = await NotificationPreference.getChannelPreferences(
          recipient.recipient_type,
          recipient.recipient_id,
          notification.type,
          tenantId
        );

        // Check if in quiet hours
        const preference = await NotificationPreference.getByEntityAndType(
          recipient.recipient_type,
          recipient.recipient_id,
          notification.type,
          tenantId
        );

        const inQuietHours = preference ? NotificationPreference.isWithinQuietHours(preference) : false;

        // If in quiet hours and not high priority, skip delivery
        if (inQuietHours && notification.priority !== 'high') {
          logger.info(`Skipping delivery for ${recipient.id} due to quiet hours`);
          continue;
        }

        // Deliver to each channel
        for (const channel of channels) {
          // Skip if channel is disabled in preferences
          if (
            channelPreferences && 
            channelPreferences[channel.id] === false
          ) {
            continue;
          }

          // Create delivery record
          const delivery = await NotificationDelivery.create({
            notificationId: notification.id,
            recipientId: recipient.id,
            channelId: channel.id,
            status: 'pending',
            tenantId
          });

          // Queue delivery for processing
          await this.queueDelivery(delivery.id, tenantId);

          deliveryResults.push(delivery);
        }
      }

      // Update notification status
      await Notification.update(notification.id, { status: 'delivered' }, tenantId);

      return deliveryResults;
    } catch (error) {
      logger.error(`Error delivering notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Queue a delivery for processing
   * @param {string} deliveryId - Delivery ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} Success
   */
  static async queueDelivery(deliveryId, tenantId) {
    try {
      // In a real implementation, this would add the delivery to a queue
      // for processing by a background worker. For now, we'll process it directly.
      const delivery = await NotificationDelivery.getById(deliveryId, tenantId);
      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      // Get notification, recipient, and channel
      const notification = await Notification.getById(delivery.notification_id, tenantId);
      const recipient = await NotificationRecipient.getById(delivery.recipient_id, tenantId);
      const channel = await NotificationChannel.getById(delivery.channel_id, tenantId);

      if (!notification || !recipient || !channel) {
        throw new Error('Missing notification, recipient, or channel');
      }

      // Process delivery based on channel type
      let success = false;
      let errorMessage = null;

      switch (channel.type) {
        case 'in-app':
          // For in-app notifications, we just mark it as delivered
          // The client will fetch pending notifications
          success = true;
          break;

        case 'email':
          // In a real implementation, this would send an email
          logger.info(`[EMAIL] Sending to ${recipient.recipient_id}: ${notification.title}`);
          success = true;
          break;

        case 'push':
          // In a real implementation, this would send a push notification
          logger.info(`[PUSH] Sending to ${recipient.recipient_id}: ${notification.title}`);
          success = true;
          break;

        case 'slack':
          // In a real implementation, this would send a Slack message
          logger.info(`[SLACK] Sending to ${channel.config.channel}: ${notification.title}`);
          success = true;
          break;

        case 'telegram':
          // In a real implementation, this would send a Telegram message
          logger.info(`[TELEGRAM] Sending to ${channel.config.chatId}: ${notification.title}`);
          success = true;
          break;

        default:
          errorMessage = `Unsupported channel type: ${channel.type}`;
          success = false;
      }

      // Update delivery status
      if (success) {
        await NotificationDelivery.markAsDelivered(delivery.id, tenantId);
      } else {
        await NotificationDelivery.markAsFailed(delivery.id, errorMessage || 'Unknown error', tenantId);
      }

      return success;
    } catch (error) {
      logger.error(`Error processing delivery ${deliveryId}:`, error);
      
      // Update delivery status
      try {
        await NotificationDelivery.markAsFailed(deliveryId, error.message, tenantId);
      } catch (updateError) {
        logger.error(`Error updating delivery status for ${deliveryId}:`, updateError);
      }

      throw error;
    }
  }

  /**
   * Get notifications for a recipient
   * @param {string} recipientType - Recipient type (household, member)
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Notifications
   */
  static async getNotificationsForRecipient(recipientType, recipientId, tenantId, options = {}) {
    try {
      return NotificationRecipient.getByRecipient(
        recipientType, 
        recipientId, 
        tenantId, 
        options
      );
    } catch (error) {
      logger.error(`Error getting notifications for ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a recipient
   * @param {string} recipientType - Recipient type (household, member)
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(recipientType, recipientId, tenantId) {
    try {
      return NotificationRecipient.getUnreadCount(
        recipientType, 
        recipientId, 
        tenantId
      );
    } catch (error) {
      logger.error(`Error getting unread count for ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} recipientId - Notification recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification recipient
   */
  static async markAsRead(recipientId, tenantId) {
    try {
      return NotificationRecipient.markAsRead(recipientId, tenantId);
    } catch (error) {
      logger.error(`Error marking notification ${recipientId} as read:`, error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a recipient
   * @param {string} recipientType - Recipient type (household, member)
   * @param {string} recipientId - Recipient ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Number of updated records
   */
  static async markAllAsRead(recipientType, recipientId, tenantId) {
    try {
      return NotificationRecipient.markAllAsRead(
        recipientType, 
        recipientId, 
        tenantId
      );
    } catch (error) {
      logger.error(`Error marking all notifications as read for ${recipientType}:${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Number of processed notifications
   */
  static async processScheduledNotifications(tenantId) {
    try {
      // Get due notifications
      const dueNotifications = await Notification.getDueNotifications(tenantId);
      
      let processedCount = 0;
      
      // Deliver each notification
      for (const notification of dueNotifications) {
        await this.deliverNotification(notification.id, tenantId);
        processedCount++;
      }
      
      return processedCount;
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Process pending delivery retries
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Number of processed retries
   */
  static async processPendingRetries(tenantId) {
    try {
      // Get pending retries
      const pendingRetries = await NotificationDelivery.getPendingRetries(tenantId);
      
      let processedCount = 0;
      
      // Process each retry
      for (const delivery of pendingRetries) {
        await this.queueDelivery(delivery.id, tenantId);
        processedCount++;
      }
      
      return processedCount;
    } catch (error) {
      logger.error('Error processing pending retries:', error);
      throw error;
    }
  }

  /**
   * Create a notification channel
   * @param {Object} data - Channel data
   * @param {string} data.name - Channel name
   * @param {string} data.type - Channel type
   * @param {Object} data.config - Channel configuration
   * @param {boolean} data.active - Whether the channel is active
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created channel
   */
  static async createChannel(data) {
    try {
      return NotificationChannel.create(data);
    } catch (error) {
      logger.error('Error creating notification channel:', error);
      throw error;
    }
  }

  /**
   * Create a notification template
   * @param {Object} data - Template data
   * @param {string} data.name - Template name
   * @param {string} data.type - Template type
   * @param {string} data.titleTemplate - Title template
   * @param {string} data.bodyTemplate - Body template
   * @param {Object} data.dataSchema - Data schema
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created template
   */
  static async createTemplate(data) {
    try {
      return NotificationTemplate.create(data);
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Set notification preferences
   * @param {Object} data - Preference data
   * @param {string} data.entityType - Entity type ('household', 'member')
   * @param {string} data.entityId - Entity ID
   * @param {string} data.notificationType - Notification type
   * @param {Object} data.channels - Channel preferences
   * @param {boolean} data.enabled - Whether notifications are enabled
   * @param {string} data.quietHoursStart - Quiet hours start time
   * @param {string} data.quietHoursEnd - Quiet hours end time
   * @param {number} data.frequencyLimit - Maximum notifications per day
   * @param {string} data.tenantId - Tenant ID
   * @returns {Promise<Object>} Created or updated preference
   */
  static async setPreferences(data) {
    try {
      const {
        entityType,
        entityId,
        notificationType,
        tenantId
      } = data;

      // Check if preference exists
      const existing = await NotificationPreference.getByEntityAndType(
        entityType,
        entityId,
        notificationType,
        tenantId
      );

      if (existing) {
        // Update existing preference
        return NotificationPreference.update(existing.id, data, tenantId);
      } else {
        // Create new preference
        return NotificationPreference.create(data);
      }
    } catch (error) {
      logger.error('Error setting notification preferences:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
