# Checklist Feature Testing Guide - June 15, 2025

## Overview
This guide provides step-by-step instructions for testing the checklist functionality after implementing fixes for the SQL error and file attachment issues.

## Access Information
- **Application URL**: http://localhost:8088
- **Test Credentials**: 
  - Email: demo@trusted360.com
  - Password: demo123

## Testing Scenarios

### 1. Test Mark as Complete Functionality

**Steps:**
1. Log in to the application
2. Navigate to the Checklists section
3. Select a checklist that is in "In Progress" status
4. Complete all remaining checklist items by:
   - Clicking the checkbox next to each item
   - Adding any required notes
   - Saving changes if needed
5. Once all items are completed (100% progress), click the "Mark as Complete" button
6. Verify the checklist status changes to "Completed"

**Expected Results:**
- ✅ No SQL errors in the browser console
- ✅ Checklist status updates successfully to "Completed"
- ✅ Completion timestamp is recorded
- ✅ Page refreshes or redirects appropriately

### 2. Test File Attachment Download

**Steps:**
1. Navigate to a checklist with existing file attachments OR
2. Create a new file attachment:
   - Select a checklist item that is completed
   - Click the file attachment button (paperclip icon)
   - Upload a test file (PDF, image, or document)
   - Wait for successful upload confirmation
3. Click on the file attachment chip/button to download
4. Verify the file downloads correctly

**Expected Results:**
- ✅ File attachment chips are clickable
- ✅ Clicking triggers a file download
- ✅ Downloaded file opens correctly
- ✅ No 404 errors in the browser console

### 3. Complete End-to-End Checklist Workflow

**Steps:**
1. Create a new checklist or select a pending one
2. Enter Edit Mode
3. Complete several items with notes
4. Add comments to items
5. Upload file attachments to completed items
6. Assign the checklist to a user
7. Set or update the due date
8. Complete all remaining items
9. Mark the checklist as complete

**Expected Results:**
- ✅ All features work seamlessly together
- ✅ No errors at any step
- ✅ Data persists correctly
- ✅ UI updates reflect all changes

## Troubleshooting

### If you encounter issues:

1. **Check Docker containers are running:**
   ```bash
   docker compose ps
   ```

2. **Check API logs for errors:**
   ```bash
   docker compose logs api --tail 50
   ```

3. **Check browser console for errors:**
   - Open Developer Tools (F12)
   - Check Console tab for red error messages

4. **Restart containers if needed:**
   ```bash
   docker compose restart
   ```

## Fixed Issues Summary

1. **SQL Error on Mark as Complete**: Fixed by separating the tenant verification query from the update query
2. **File Attachment Download**: Added proper download endpoint with secure file streaming

## API Endpoints for Testing

- `PUT /api/checklists/{id}/status` - Update checklist status (Mark as Complete)
- `GET /api/checklists/attachments/{attachmentId}/download` - Download file attachment

## Notes
- All fixes maintain proper tenant isolation for security
- File downloads include proper content headers for browser handling
- The SQL fix ensures compatibility with PostgreSQL syntax requirements
