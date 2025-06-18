const express = require('express');
const sqlRoutes = require('./sql.routes');
const healthRoutes = require('./health.routes');
const logsRoutes = require('./logs.routes');
const schemaRoutes = require('./schema.routes');
const adminAuth = require('../../middleware/adminAuth');

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(adminAuth);

// Mount admin route modules
router.use('/sql', sqlRoutes);
router.use('/health', healthRoutes);
router.use('/logs', logsRoutes);
router.use('/schema', schemaRoutes);

module.exports = router;
