# Checklist Count Display Testing Guide
Date: June 15, 2025

## Overview
This guide covers testing the checklist count display functionality on the Dashboard and Properties pages after implementing fixes for accurate checklist assignments.

## Test Prerequisites
1. Application is running via Docker Compose
2. Test user account is available (demo@example.com / password123)
3. Properties and checklists have been created in the system

## Test Scenarios

### 1. Dashboard Page - Properties Overview Section

**Test Steps:**
1. Log in to the application
2. Navigate to the Dashboard (default landing page)
3. Look at the "Properties Overview" section

**Expected Results:**
- Each property card should display:
  - Property name
  - Property address
  - Status chip (Active/Inactive)
  - Camera count chip (e.g., "2 cameras")
  - **Checklist count chip** (e.g., "3 checklists") - only shown if property has checklists
- Properties without checklists should NOT show a checklist count chip
- The count should match the actual number of checklists assigned to that property

**Verification Query:**
```sql
-- Run this query to verify checklist counts per property
SELECT 
    p.id,
    p.name,
    p.address,
    COUNT(DISTINCT c.id) as checklist_count
FROM properties p
LEFT JOIN checklists c ON c.property_id = p.id
WHERE p.tenant_id = 'demo-tenant'
GROUP BY p.id, p.name, p.address
ORDER BY p.name;
```

### 2. Dashboard Page - Recent Checklists Section

**Test Steps:**
1. On the Dashboard, look at the "Recent Checklists" section

**Expected Results:**
- Shows up to 5 most recent checklists
- Each checklist item displays:
  - Template name (e.g., "Security Audit Checklist")
  - Property name (e.g., "Downtown Office Building")
  - Creation date
  - Status chip (Pending/In Progress/Completed/Approved/Rejected)
- Clicking on a checklist navigates to its detail page
- If no checklists exist, shows "No checklists created yet" with a "Create Your First Checklist" button

### 3. Properties Page - Property List

**Test Steps:**
1. Navigate to Properties page from the sidebar
2. Review the property list/grid

**Expected Results:**
- Each property card should display checklist count if > 0
- The checklist count should be accurate for each property
- Properties without checklists should not show a count

### 4. Properties Page - Property Detail

**Test Steps:**
1. Click on a property to view its details
2. Check the property information section

**Expected Results:**
- Property details should show total checklist count
- Should list associated checklists if any exist
- Checklist count should match the actual number in the database

## Common Issues to Check

### Issue 1: Incorrect Counts
- **Symptom**: Checklist count doesn't match actual number
- **Check**: Verify the API response includes `checklist_count` field
- **API Endpoint**: `GET /api/properties/summary`

### Issue 2: Missing Checklist Chips
- **Symptom**: Properties with checklists don't show count
- **Check**: Ensure `property.checklist_count` is properly handled in the UI
- **Code Location**: `src/dashboard/src/pages/Dashboard/index.tsx`

### Issue 3: Zero Count Display
- **Symptom**: Properties show "0 checklists" instead of hiding the chip
- **Check**: Verify conditional rendering: `property.checklist_count && property.checklist_count > 0`

## API Response Verification

### Properties Summary Endpoint
```bash
# Test the properties summary endpoint
curl -X GET http://localhost:3001/api/properties/summary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Downtown Office Building",
      "address": "123 Main St, City, State 12345",
      "status": "active",
      "camera_count": 2,
      "checklist_count": 3,
      "created_at": "2025-06-14T00:00:00.000Z",
      "updated_at": "2025-06-14T00:00:00.000Z"
    }
  ]
}
```

### Checklists Endpoint
```bash
# Test the checklists endpoint
curl -X GET http://localhost:3001/api/checklists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Database Verification Queries

### 1. Verify Property Checklist Counts
```sql
-- Check checklist distribution across properties
SELECT 
    p.name as property_name,
    COUNT(c.id) as checklist_count,
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_count
FROM properties p
LEFT JOIN checklists c ON c.property_id = p.id
WHERE p.tenant_id = 'demo-tenant'
GROUP BY p.id, p.name
ORDER BY checklist_count DESC;
```

### 2. Verify Recent Checklists
```sql
-- Get 5 most recent checklists with details
SELECT 
    c.id,
    ct.name as template_name,
    p.name as property_name,
    c.status,
    c.created_at
FROM checklists c
JOIN checklist_templates ct ON c.template_id = ct.id
JOIN properties p ON c.property_id = p.id
WHERE c.tenant_id = 'demo-tenant'
ORDER BY c.created_at DESC
LIMIT 5;
```

## Test Data Setup

If you need to create test data:

### 1. Create Properties
```sql
-- Insert test properties if needed
INSERT INTO properties (name, address, property_type, status, tenant_id, created_at, updated_at)
VALUES 
    ('Test Property 1', '111 Test St', 'office', 'active', 'demo-tenant', NOW(), NOW()),
    ('Test Property 2', '222 Test Ave', 'retail', 'active', 'demo-tenant', NOW(), NOW()),
    ('Test Property 3', '333 Test Blvd', 'warehouse', 'active', 'demo-tenant', NOW(), NOW());
```

### 2. Create Checklists
```sql
-- Create checklists for testing (assuming template_id 1 exists)
INSERT INTO checklists (template_id, property_id, status, tenant_id, created_at, updated_at)
SELECT 
    1 as template_id,
    p.id as property_id,
    'pending' as status,
    'demo-tenant' as tenant_id,
    NOW() as created_at,
    NOW() as updated_at
FROM properties p
WHERE p.tenant_id = 'demo-tenant'
LIMIT 3;
```

## Success Criteria

✅ Dashboard shows accurate checklist counts for each property
✅ Properties without checklists don't show a count chip
✅ Recent checklists section displays up to 5 most recent items
✅ Checklist counts match database records
✅ UI properly handles zero counts (hides chip)
✅ Navigation from checklist items works correctly
✅ Properties page reflects same counts as Dashboard

## Troubleshooting

### If counts are not showing:
1. Check browser console for errors
2. Verify API responses include `checklist_count` field
3. Check network tab for API calls to `/api/properties/summary`
4. Ensure the frontend is properly parsing the response

### If counts are incorrect:
1. Run the verification queries above
2. Check for tenant_id filtering issues
3. Verify JOIN conditions in the API query
4. Look for any deleted checklists that might affect counts

## Related Files
- API: `src/api/src/services/property.service.js`
- Frontend: `src/dashboard/src/pages/Dashboard/index.tsx`
- Frontend: `src/dashboard/src/pages/Properties/index.tsx`
- Types: `src/dashboard/src/types/property.types.ts`
