/**
 * SOP Module Rollback Configuration
 * 
 * This file provides a quick way to disable the SOP module if issues arise.
 * Simply set ENABLE_SOP_MODULE=false in your environment variables or
 * modify the default value below.
 */

module.exports = {
  // Feature flag to enable/disable SOP module
  enableSopModule: process.env.ENABLE_SOP_MODULE !== 'false',
  
  // Rollback steps if SOP module causes issues:
  rollbackInstructions: `
    ROLLBACK PROCEDURE:
    
    1. IMMEDIATE DISABLE (Fastest - 30 seconds):
       - Set environment variable: ENABLE_SOP_MODULE=false
       - Restart the API service
    
    2. PARTIAL ROLLBACK (If specific features are problematic):
       - Comment out specific SOP routes in src/api/src/routes/index.js
       - Keep database tables (no data loss)
       - Restart the API service
    
    3. FULL ROLLBACK (Complete removal):
       a. Disable routes:
          - Comment out line in src/api/src/routes/index.js:
            // router.use('/sops', authMiddleware(...), sopRoutes(services));
       
       b. Remove service initialization (optional):
          - Comment out SOP service in src/api/src/index.js
       
       c. Rollback database (if needed):
          - Run: npm run migrate:down -- --to 20250702000002
          - This will remove SOP tables
    
    4. DEPLOYMENT ROLLBACK (AWS ECS):
       - Use previous task definition without SOP module
       - Update ECS service to use previous version
       - No code changes needed
  `
};