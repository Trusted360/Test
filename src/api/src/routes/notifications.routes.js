const express = require('express');
const { NotificationController } = require('../controllers');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Notification routes
router.post('/', NotificationController.createNotification);
router.post('/template', NotificationController.createFromTemplate);
router.get('/:recipientType/:recipientId', NotificationController.getNotifications);
router.get('/:recipientType/:recipientId/unread', NotificationController.getUnreadCount);
router.put('/:recipientId/read', NotificationController.markAsRead);
router.put('/:recipientType/:recipientId/read-all', NotificationController.markAllAsRead);

// Channel routes
router.post('/channels', NotificationController.createChannel);
router.get('/channels', NotificationController.getChannels);

// Template routes
router.post('/templates', NotificationController.createTemplate);
router.get('/templates', NotificationController.getTemplates);

// Preference routes
router.post('/preferences', NotificationController.setPreferences);
router.get('/preferences/:entityType/:entityId', NotificationController.getPreferences);

// Admin routes (these should have additional admin authorization in a real implementation)
router.post('/admin/process-scheduled', NotificationController.processScheduledNotifications);
router.post('/admin/process-retries', NotificationController.processPendingRetries);

module.exports = router;
