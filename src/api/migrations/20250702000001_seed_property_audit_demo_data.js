/**
 * Seed Property Audit Demo Data
 * Creates comprehensive demo data for property checklists and audit logs
 */

exports.up = async function(knex) {
  const tenantId = 'default';
  
  // Get existing users
  const users = await knex('users').where('tenant_id', tenantId).limit(5);
  if (users.length === 0) {
    console.log('No users found, skipping property audit demo data');
    return;
  }
  
  // Get existing properties
  const properties = await knex('properties').where('tenant_id', tenantId).limit(5);
  if (properties.length === 0) {
    console.log('No properties found, skipping property audit demo data');
    return;
  }
  
  // Get existing checklist templates
  const templates = await knex('checklist_templates').where('tenant_id', tenantId);
  if (templates.length === 0) {
    console.log('No checklist templates found, creating some...');
    
    // Create checklist templates
    const [dailyTemplate] = await knex('checklist_templates').insert({
      name: 'Daily Property Inspection',
      description: 'Daily walkthrough checklist for property managers',
      category: 'inspection',
      is_active: true,
      created_by: users[0].id,
      tenant_id: tenantId,
      is_scheduled: true,
      schedule_frequency: 'daily',
      schedule_time: '08:00:00'
    }).returning('*');
    
    const [weeklyTemplate] = await knex('checklist_templates').insert({
      name: 'Weekly Security Audit',
      description: 'Comprehensive weekly security and safety audit',
      category: 'security',
      is_active: true,
      created_by: users[0].id,
      tenant_id: tenantId,
      is_scheduled: true,
      schedule_frequency: 'weekly',
      schedule_days_of_week: JSON.stringify([1, 3, 5])
    }).returning('*');
    
    const [maintenanceTemplate] = await knex('checklist_templates').insert({
      name: 'Monthly Maintenance Check',
      description: 'Monthly equipment and facility maintenance checklist',
      category: 'maintenance',
      is_active: true,
      created_by: users[0].id,
      tenant_id: tenantId,
      is_scheduled: true,
      schedule_frequency: 'monthly',
      schedule_day_of_month: 1
    }).returning('*');
    
    // Create checklist items for daily template
    const dailyItems = [
      { template_id: dailyTemplate.id, item_text: 'Check all entry/exit doors are secure', item_type: 'checkbox', is_required: true, sort_order: 1 },
      { template_id: dailyTemplate.id, item_text: 'Verify security cameras are operational', item_type: 'checkbox', is_required: true, sort_order: 2 },
      { template_id: dailyTemplate.id, item_text: 'Inspect parking areas for issues', item_type: 'checkbox', is_required: true, sort_order: 3 },
      { template_id: dailyTemplate.id, item_text: 'Check lighting in common areas', item_type: 'checkbox', is_required: false, sort_order: 4 },
      { template_id: dailyTemplate.id, item_text: 'Review overnight incident reports', item_type: 'checkbox', is_required: true, sort_order: 5 },
      { template_id: dailyTemplate.id, item_text: 'Verify alarm systems are armed', item_type: 'checkbox', is_required: true, sort_order: 6 },
      { template_id: dailyTemplate.id, item_text: 'Note any maintenance issues found', item_type: 'text', is_required: false, sort_order: 7 },
      { template_id: dailyTemplate.id, item_text: 'Take photos of any issues', item_type: 'photo', is_required: false, sort_order: 8 }
    ];
    
    const weeklyItems = [
      { template_id: weeklyTemplate.id, item_text: 'Test all emergency exits', item_type: 'checkbox', is_required: true, sort_order: 1 },
      { template_id: weeklyTemplate.id, item_text: 'Check fire extinguisher status', item_type: 'checkbox', is_required: true, sort_order: 2 },
      { template_id: weeklyTemplate.id, item_text: 'Review security footage for anomalies', item_type: 'checkbox', is_required: true, sort_order: 3 },
      { template_id: weeklyTemplate.id, item_text: 'Test backup power systems', item_type: 'checkbox', is_required: true, sort_order: 4 },
      { template_id: weeklyTemplate.id, item_text: 'Inspect perimeter fencing', item_type: 'checkbox', is_required: false, sort_order: 5 },
      { template_id: weeklyTemplate.id, item_text: 'Document security concerns', item_type: 'text', is_required: false, sort_order: 6 }
    ];
    
    const maintenanceItems = [
      { template_id: maintenanceTemplate.id, item_text: 'HVAC system inspection', item_type: 'checkbox', is_required: true, sort_order: 1 },
      { template_id: maintenanceTemplate.id, item_text: 'Plumbing fixtures check', item_type: 'checkbox', is_required: true, sort_order: 2 },
      { template_id: maintenanceTemplate.id, item_text: 'Electrical panel inspection', item_type: 'checkbox', is_required: true, sort_order: 3 },
      { template_id: maintenanceTemplate.id, item_text: 'Roof and gutter inspection', item_type: 'checkbox', is_required: false, sort_order: 4 },
      { template_id: maintenanceTemplate.id, item_text: 'Equipment serial numbers verified', item_type: 'checkbox', is_required: true, sort_order: 5 }
    ];
    
    await knex('checklist_items').insert([...dailyItems, ...weeklyItems, ...maintenanceItems]);
    
    templates.push(dailyTemplate, weeklyTemplate, maintenanceTemplate);
  }
  
  // Create property checklists with various statuses
  const now = new Date();
  const checklists = [];
  
  // Create completed checklists from the past 30 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdDate = new Date(now);
    createdDate.setDate(createdDate.getDate() - daysAgo);
    
    const completedDate = new Date(createdDate);
    completedDate.setHours(completedDate.getHours() + Math.floor(Math.random() * 4) + 1);
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const property = properties[Math.floor(Math.random() * properties.length)];
    const assignee = users[Math.floor(Math.random() * users.length)];
    
    const [checklist] = await knex('property_checklists').insert({
      property_id: property.id,
      template_id: template.id,
      assigned_to: assignee.id,
      status: 'completed',
      due_date: new Date(createdDate.getTime() + 24 * 60 * 60 * 1000),
      created_at: createdDate,
      completed_at: completedDate,
      updated_at: completedDate
    }).returning('*');
    
    checklists.push(checklist);
  }
  
  // Create in-progress checklists
  for (let i = 0; i < 5; i++) {
    const createdDate = new Date(now);
    createdDate.setHours(createdDate.getHours() - Math.floor(Math.random() * 12));
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const property = properties[Math.floor(Math.random() * properties.length)];
    const assignee = users[Math.floor(Math.random() * users.length)];
    
    const [checklist] = await knex('property_checklists').insert({
      property_id: property.id,
      template_id: template.id,
      assigned_to: assignee.id,
      status: 'in_progress',
      due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      created_at: createdDate,
      updated_at: createdDate
    }).returning('*');
    
    checklists.push(checklist);
  }
  
  // Create pending checklists
  for (let i = 0; i < 8; i++) {
    const createdDate = new Date(now);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 2));
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const property = properties[Math.floor(Math.random() * properties.length)];
    const assignee = users[Math.floor(Math.random() * users.length)];
    
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 3) + 1);
    
    const [checklist] = await knex('property_checklists').insert({
      property_id: property.id,
      template_id: template.id,
      assigned_to: assignee.id,
      status: 'pending',
      due_date: dueDate,
      created_at: createdDate,
      updated_at: createdDate
    }).returning('*');
    
    checklists.push(checklist);
  }
  
  // Create some overdue checklists
  for (let i = 0; i < 3; i++) {
    const daysOverdue = Math.floor(Math.random() * 5) + 1;
    const createdDate = new Date(now);
    createdDate.setDate(createdDate.getDate() - (daysOverdue + 2));
    
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() - daysOverdue);
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const property = properties[Math.floor(Math.random() * properties.length)];
    const assignee = users[Math.floor(Math.random() * users.length)];
    
    const [checklist] = await knex('property_checklists').insert({
      property_id: property.id,
      template_id: template.id,
      assigned_to: assignee.id,
      status: 'pending',
      due_date: dueDate,
      created_at: createdDate,
      updated_at: createdDate
    }).returning('*');
    
    checklists.push(checklist);
  }
  
  // Create checklist responses for completed and in-progress checklists
  for (const checklist of checklists) {
    if (checklist.status === 'completed' || checklist.status === 'in_progress') {
      const items = await knex('checklist_items').where('template_id', checklist.template_id);
      const itemsToComplete = checklist.status === 'completed' ? items : items.slice(0, Math.floor(items.length * 0.6));
      
      for (const item of itemsToComplete) {
        const hasIssue = Math.random() < 0.15; // 15% chance of having an issue
        const completedBy = users[Math.floor(Math.random() * users.length)];
        
        const response = {
          checklist_id: checklist.id,
          item_id: item.id,
          response_value: item.item_type === 'checkbox' ? 'checked' : 'Completed without issues',
          notes: hasIssue ? 'Found some concerns that need attention' : null,
          completed_by: completedBy.id,
          completed_at: checklist.completed_at || new Date(),
          requires_approval: item.requires_approval
        };
        
        if (hasIssue) {
          const severities = ['minor', 'moderate', 'major', 'critical'];
          const severity = severities[Math.floor(Math.random() * severities.length)];
          response.issue_severity = severity;
          response.issue_description = `${severity} issue found: ${
            severity === 'critical' ? 'Immediate attention required' :
            severity === 'major' ? 'Needs to be addressed soon' :
            severity === 'moderate' ? 'Should be scheduled for repair' :
            'Minor cosmetic issue'
          }`;
        }
        
        const [responseRecord] = await knex('checklist_responses').insert(response).returning('*');
        
        // Add some attachments randomly
        if (Math.random() < 0.3) {
          await knex('checklist_attachments').insert({
            response_id: responseRecord.id,
            file_name: `issue_photo_${responseRecord.id}.jpg`,
            file_path: `/uploads/checklists/${checklist.id}/issue_photo_${responseRecord.id}.jpg`,
            file_size: Math.floor(Math.random() * 5000000) + 500000,
            file_type: 'image/jpeg',
            uploaded_by: completedBy.id
          });
        }
        
        // Add some comments randomly
        if (hasIssue && Math.random() < 0.5) {
          await knex('checklist_comments').insert({
            checklist_id: checklist.id,
            item_id: item.id,
            created_by: users[Math.floor(Math.random() * users.length)].id,
            comment_text: 'This issue has been noted and a work order will be created.',
            created_at: new Date()
          });
        }
      }
    }
  }
  
  // Create audit logs for checklist activities
  const eventTypes = await knex('audit_event_types').whereIn('category', ['checklist', 'property']);
  
  if (eventTypes.length === 0) {
    // Insert audit event types if they don't exist
    await knex('audit_event_types').insert([
      { category: 'checklist', action: 'created', description: 'Checklist created' },
      { category: 'checklist', action: 'assigned', description: 'Checklist assigned to user' },
      { category: 'checklist', action: 'started', description: 'Checklist work started' },
      { category: 'checklist', action: 'completed', description: 'Checklist completed' },
      { category: 'checklist', action: 'item_completed', description: 'Checklist item completed' },
      { category: 'checklist', action: 'issue_reported', description: 'Issue reported in checklist' },
      { category: 'checklist', action: 'comment_added', description: 'Comment added to checklist item' },
      { category: 'checklist', action: 'view_property_audits', description: 'Viewed property audit data' },
      { category: 'checklist', action: 'generate_report', description: 'Generated checklist report' },
      { category: 'property', action: 'view_dashboard', description: 'Viewed property dashboard' }
    ]);
  }
  
  // Create audit logs for the checklists
  for (const checklist of checklists) {
    const checklistEventType = await knex('audit_event_types')
      .where({ category: 'checklist', action: 'created' })
      .first();
    
    if (checklistEventType) {
      await knex('audit_logs').insert({
        event_type_id: checklistEventType.id,
        user_id: checklist.assigned_to,
        tenant_id: tenantId,
        property_id: checklist.property_id,
        entity_type: 'checklist',
        entity_id: checklist.id,
        action: 'created',
        description: `Checklist created for property inspection`,
        created_at: checklist.created_at
      });
    }
    
    if (checklist.status === 'completed') {
      const completedEventType = await knex('audit_event_types')
        .where({ category: 'checklist', action: 'completed' })
        .first();
      
      if (completedEventType) {
        await knex('audit_logs').insert({
          event_type_id: completedEventType.id,
          user_id: checklist.assigned_to,
          tenant_id: tenantId,
          property_id: checklist.property_id,
          entity_type: 'checklist',
          entity_id: checklist.id,
          action: 'completed',
          description: `Checklist completed successfully`,
          created_at: checklist.completed_at
        });
      }
    }
  }
  
  console.log(`Created ${checklists.length} property checklists with responses and audit logs`);
};

exports.down = async function(knex) {
  // This is demo data, so we don't need to remove it specifically
  // It will be removed when the tables are dropped
};