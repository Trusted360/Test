# Trusted360 Issue Tracker

**Last Updated:** 2025-06-24  
**Status:** Critical Issues Resolved - Focus on P1 Features

## Overview
This document tracks all known issues, bugs, and feature requests for the Trusted360 self-storage security platform.

## Recent Updates (2025-06-24)
**All Critical P0 Issues Resolved:**
- ✅ **Settings Module**: Fixed missing routes - all settings endpoints now functional
- ✅ **Properties Module**: Fixed column name mismatch - property creation working
- ✅ **IAM Analysis**: Core authentication working - clarified as user management feature request

The system is now stable with all core functionality operational. Focus can shift to P1 features and enhancements.

---

## Critical Issues (P0 - Blocking)

### 🔴 Settings Module - Complete Failure
**Status:** RESOLVED  
**Component:** Settings  
**Description:** ~~All settings functionality is non-functional~~ **FIXED:** Missing settings routes file
- [x] Failed to load settings - **FIXED:** Created `/src/api/src/routes/settings.routes.js`
- [x] User preferences fail to save - **FIXED:** Added settings routes to main router
- [x] Integration settings fail to save - **FIXED:** Settings API endpoints now working
- [x] Camera settings fail to save - **FIXED:** All settings endpoints functional
- [x] Notifications fail to save - **FIXED:** Settings service restored

**Resolution:** Settings routes were missing from the newer API structure. Created settings.routes.js and integrated into main routes.

### 🔴 Properties Module - Creation Failure
**Status:** RESOLVED  
**Component:** Properties  
**Description:** ~~Unable to create new properties~~ **FIXED:** Column name mismatch in property service
- [x] Investigate creation workflow - **FIXED:** Property service using wrong column name
- [x] Fix database constraints - **FIXED:** Changed `property_type` to `property_type_id` in service
- [x] Test property assignment flow - **FIXED:** Property creation now working

**Resolution:** Property service was using `property_type` column name but database has `property_type_id`. Updated all references in property.service.js.

### 🔴 IAM Issues
**Status:** CLARIFIED  
**Component:** User Management  
**Description:** ~~Identity and Access Management problems~~ **ANALYSIS:** Authentication works, missing user management features
- [x] Define specific IAM failures - **ANALYSIS:** Auth middleware and permissions are working correctly
- [x] Fix permission system - **VERIFIED:** Role-based access control is functional
- [x] Test role-based access - **VERIFIED:** Admin/user roles properly restricted

**Analysis:** Core IAM functionality (authentication, authorization, role-based access) is working properly. The "IAM issues" appear to be missing user management features (create/edit/delete users) rather than broken authentication. This should be reclassified as a feature request for user management admin interface.

---

## High Priority Issues (P1 - Major Features)

### 🟡 Auditing & Reporting System
**Status:** OPEN  
**Component:** Reporting  
**Description:** Key feature for admin/property owner oversight
- [ ] Design database schema for audit trails
- [ ] Implement activity tracking for:
  - [ ] Checklist creation and completion
  - [ ] User assignments
  - [ ] Video events (triggered, completed, checklist creation)
  - [ ] Template creation
- [ ] Create reporting UI/dashboard
- [ ] Enable report generation and export

### 🟡 Checklist & Templates - Database Constraints
**Status:** OPEN  
**Component:** Checklists  
**Error:** `delete from "checklist_items" where "template_id" = $1 violates foreign key constraint`
- [ ] Fix foreign key constraint issue
- [ ] Implement cascade delete or proper cleanup
- [ ] Add property selection as first field
- [ ] Fix search functionality
- [ ] Control template availability based on property

---

## Medium Priority Issues (P2 - Important)

### 🟠 Dashboard Navigation
**Status:** OPEN  
**Component:** Dashboard  
**Description:** Navigation failures
- [ ] Fix "Video Feed Events" 404 error
- [ ] Verify all dashboard links
- [ ] Add proper route handling

### 🟠 Video Analysis
**Status:** OPEN  
**Component:** Video Analysis  
**Description:** Service ticket creation errors
- [ ] Debug service ticket creation
- [ ] Fix error handling
- [ ] Test video analysis workflow

### 🟠 Chatbot Functionality
**Status:** OPEN  
**Component:** Chatbot  
**Description:** Multiple chatbot issues
- [ ] Fix chat history display ("new conversation" and "undefined")
- [ ] Implement AI title/description generation
- [ ] Ensure full demo functionality

---

## Low Priority Issues (P3 - Minor/Cosmetic)

### 🟢 UI/UX Issues
**Status:** OPEN  
**Component:** Frontend  
**Description:** Various UI problems
- [ ] Fix login page collapsed menu
- [ ] Remove unwanted scrollbar in collapsed menu
- [ ] Improve mobile responsiveness

---

## Feature Requests

### 👥 User Management Interface
**Status:** PLANNED  
**Component:** Admin Portal  
**Description:** Admin interface for managing users, roles, and permissions
- [ ] Create user management routes/API endpoints
- [ ] Design user listing interface in admin portal
- [ ] Add user creation/editing forms
- [ ] Implement role assignment functionality
- [ ] Add user activation/deactivation
- [ ] Include password reset capabilities

### 📋 Knowledge Base System
**Status:** PLANNED  
**Component:** Knowledge Base  
**Description:** Integrate with checklists functionality
- [ ] Design knowledge base schema
- [ ] Create UI for knowledge articles
- [ ] Link to checklist items
- [ ] Add search functionality

### 📅 Scheduling System
**Status:** PLANNED  
**Component:** Scheduling  
**Description:** Automated template scheduling
- [ ] Implement recurring options:
  - [ ] Daily scheduling
  - [ ] Monthly scheduling
  - [ ] Quarterly scheduling
- [ ] Add template timeline definitions
- [ ] Create scheduling UI
- [ ] Build automation engine

---

## Demo Requirements Checklist

### Must-Have for Demo
- [ ] **Audit Demo Checklist**: Replicate audit demo functionality
- [ ] **Mobile Features**: 
  - [ ] Mobile-responsive design
  - [ ] Photo upload capability
- [ ] **Chatbot**: Fully functional for demonstration
- [ ] **Recurring Templates**: Show automated scheduling
- [ ] **Enhanced Reporting**: 
  - [ ] Display completed tasks with details
  - [ ] Comprehensive completion reports

---

## Issue Status Definitions
- **OPEN**: Issue identified, not yet addressed
- **IN PROGRESS**: Actively being worked on
- **BLOCKED**: Cannot proceed due to dependency
- **RESOLVED**: Fixed and tested
- **CLOSED**: Verified and deployed

## Priority Levels
- **P0 (🔴)**: Critical - System breaking, blocks all work
- **P1 (🟡)**: High - Major feature broken, impacts users significantly
- **P2 (🟠)**: Medium - Important but has workaround
- **P3 (🟢)**: Low - Minor issue, cosmetic, or nice-to-have

---

## Notes
- All testing must be done in Docker Compose environment
- Use `docker compose down -v` before rebuilding
- Use `docker compose up --build -d` to start application
- Run `npm run lint` and `npm run typecheck` after code changes