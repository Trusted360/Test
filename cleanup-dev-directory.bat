@echo off
echo Cleaning up C:\Trusted360ENV\dev\App directory...
echo.

cd "C:\Trusted360ENV\dev\App"

echo ===========================================
echo REMOVING OLD TASK DEFINITION FILES
echo ===========================================

REM Remove old/unused task definition files
del "debug-task-def.json" 2>nul
del "fixed-td.json" 2>nul
del "task-definition-debug-v1.json" 2>nul
del "task-definition-dev-fixed-same-db.json" 2>nul
del "task-definition-env-fixed-v2.json" 2>nul
del "task-definition-env-fixed.json" 2>nul
del "task-definition-final-no-redis.json" 2>nul
del "task-definition-final-v3.json" 2>nul
del "task-definition-fixed-v1.json" 2>nul
del "task-definition-mobile-v5-fixed.json" 2>nul
del "task-definition-mobile-v5.json" 2>nul
del "task-definition-mobile-v6-login-fixed.json" 2>nul
del "task-definition-mobile-v7-login-fully-fixed.json" 2>nul
del "task-definition-mobile-v8-black-logo.json" 2>nul
del "task-definition-mobile-v8-final-logo-with-routing.json" 2>nul
del "task-definition-mobile-v8-final-logo.json" 2>nul
del "task-definition-mobile-v8-logo-branding.json" 2>nul
del "task-definition-prod-corrected.json" 2>nul
del "task-definition-redis-free.json" 2>nul
del "task-definition-rollback.json" 2>nul
del "task-definition-sop-v1.jsonX" 2>nul
del "task-definition-uat-corrected.json" 2>nul
del "task-definition-with-alb.json" 2>nul

echo ===========================================
echo REMOVING OLD TEST/DEBUG FILES
echo ===========================================

REM Remove test and debug files
del "test-db-connectivity.js" 2>nul
del "test-migration-status.js" 2>nul
del "test-user-data.js" 2>nul
del "verify-database.js" 2>nul

echo ===========================================
echo REMOVING OLD DOCUMENTATION FILES
echo ===========================================

REM Remove old documentation files (keeping current ones)
del "DEPLOYMENT_GUIDE.md" 2>nul
del "DEPLOYMENT_INSTRUCTIONS.md" 2>nul
del "DATABASE_TESTING_GUIDE.md" 2>nul
del "MOBILE_DEPLOYMENT_STATUS.md" 2>nul
del "MULTI_ENVIRONMENT_DEPLOYMENT_PLAN.md" 2>nul
del "PRODUCTION_STATE_REPORT.mdX" 2>nul
del "SOP_DEPLOYMENT_INCIDENT_REPORT.md" 2>nul

echo ===========================================
echo REMOVING OLD LOGO FILES
echo ===========================================

REM Remove old logo files (keeping only necessary ones)
del "Trusted360_Logo.png" 2>nul
del "Trusted360_Logo_Black.png" 2>nul
del "Trusted360_Logo_FInal.PNG" 2>nul
del "Trusted360_Logo_RectangleBlack.png" 2>nul

echo ===========================================
echo CLEANING COMPLETE
echo ===========================================
echo.
echo Files kept for deployment:
echo ✅ task-definition-dev-corrected.json (WORKING VERSION)
echo ✅ migration-task-overrides.json
echo ✅ TRUSTED360-DEV-DEPLOYMENT.md
echo ✅ README-DEPLOYMENT-GUIDE.md  
echo ✅ ENVIRONMENT-COPY-DEPLOYMENT-GUIDE.md
echo ✅ src/ directory (source code)
echo ✅ Essential config files (.env.example, .gitignore, etc.)
echo.
echo Directory is now clean and ready for copying to UAT/PROD!
echo.
pause