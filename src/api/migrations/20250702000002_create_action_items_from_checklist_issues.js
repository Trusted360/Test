/**
 * Create Action Items from Checklist Issues
 * Converts checklist issues into actionable work orders
 */

exports.up = async function(knex) {
  // Get all checklist responses with issues
  const issuesFound = await knex('checklist_responses as cr')
    .join('checklist_items as ci', 'cr.item_id', 'ci.id')
    .join('property_checklists as pc', 'cr.checklist_id', 'pc.id')
    .join('properties as p', 'pc.property_id', 'p.id')
    .whereNotNull('cr.issue_severity')
    .where('cr.issue_severity', '!=', 'none')
    .select(
      'cr.*',
      'ci.item_text',
      'pc.property_id',
      'pc.assigned_to as inspector_id',
      'p.tenant_id'
    );

  console.log(`Found ${issuesFound.length} checklist issues to convert to action items`);

  // Create action items from issues
  const actionItems = [];
  const now = new Date();

  for (const issue of issuesFound) {
    // Determine priority and due date based on severity
    let priority = 'medium';
    let dueDays = 7;
    let cost = 100;

    switch (issue.issue_severity) {
      case 'critical':
        priority = 'high';
        dueDays = 1;
        cost = Math.floor(Math.random() * 5000) + 2000; // $2000-7000
        break;
      case 'major':
        priority = 'high';
        dueDays = 3;
        cost = Math.floor(Math.random() * 3000) + 500; // $500-3500
        break;
      case 'moderate':
        priority = 'medium';
        dueDays = 7;
        cost = Math.floor(Math.random() * 1000) + 100; // $100-1100
        break;
      case 'minor':
        priority = 'low';
        dueDays = 14;
        cost = Math.floor(Math.random() * 500) + 50; // $50-550
        break;
    }

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + dueDays);

    // Get available users for assignment (prefer maintenance role)
    const users = await knex('users')
      .where('tenant_id', issue.tenant_id)
      .whereIn('role', ['maintenance', 'manager', 'admin'])
      .select('id');

    const assignedTo = users.length > 0 ? users[Math.floor(Math.random() * users.length)].id : null;

    const actionItem = {
      title: `${issue.issue_severity.toUpperCase()}: ${issue.item_text}`,
      description: issue.issue_description || `Issue found during inspection: ${issue.notes || 'No additional notes'}`,
      status: issue.issue_severity === 'critical' ? 'in_progress' : 'open',
      severity: issue.issue_severity,
      priority: priority,
      property_id: issue.property_id,
      tenant_id: issue.tenant_id,
      reported_by: issue.completed_by,
      assigned_to: assignedTo,
      due_date: dueDate,
      cost: cost,
      checklist_response_id: issue.id,
      category: determineCategory(issue.item_text),
      created_at: issue.completed_at || now,
      updated_at: now
    };

    // If critical and in_progress, set started_at
    if (issue.issue_severity === 'critical') {
      actionItem.started_at = now;
    }

    actionItems.push(actionItem);
  }

  if (actionItems.length > 0) {
    await knex('action_items').insert(actionItems);
    console.log(`Created ${actionItems.length} action items from checklist issues`);
  }

  // Mark some action items as completed (30% of non-critical ones)
  const nonCriticalItems = await knex('action_items')
    .where('severity', '!=', 'critical')
    .select('id');

  const itemsToComplete = nonCriticalItems
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(nonCriticalItems.length * 0.3));

  for (const item of itemsToComplete) {
    const completedDate = new Date(now);
    completedDate.setDate(completedDate.getDate() - Math.floor(Math.random() * 5));
    
    await knex('action_items')
      .where('id', item.id)
      .update({
        status: 'completed',
        completed_at: completedDate,
        actual_hours: Math.floor(Math.random() * 8) + 1,
        updated_at: completedDate
      });
  }

  // Add some update history for in-progress items
  const inProgressItems = await knex('action_items')
    .where('status', 'in_progress')
    .select('id', 'assigned_to');

  for (const item of inProgressItems) {
    await knex('action_item_updates').insert({
      action_item_id: item.id,
      updated_by: item.assigned_to,
      update_type: 'status_change',
      old_value: 'open',
      new_value: 'in_progress',
      update_note: 'Started working on this issue',
      created_at: now
    });
  }

  // Create some overdue items by adjusting due dates
  const openItems = await knex('action_items')
    .where('status', 'open')
    .select('id');

  const itemsToMakeOverdue = openItems
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(openItems.length * 0.25)); // 25% overdue

  for (const item of itemsToMakeOverdue) {
    const overdueDays = Math.floor(Math.random() * 5) + 1;
    const overdueDate = new Date(now);
    overdueDate.setDate(overdueDate.getDate() - overdueDays);
    
    await knex('action_items')
      .where('id', item.id)
      .update({
        due_date: overdueDate
      });
  }
};

function determineCategory(itemText) {
  const text = itemText.toLowerCase();
  
  if (text.includes('hvac') || text.includes('heating') || text.includes('cooling') || text.includes('air')) {
    return 'hvac';
  } else if (text.includes('plumb') || text.includes('water') || text.includes('pipe')) {
    return 'plumbing';
  } else if (text.includes('electric') || text.includes('power') || text.includes('light')) {
    return 'electrical';
  } else if (text.includes('door') || text.includes('lock') || text.includes('security')) {
    return 'security';
  } else if (text.includes('roof') || text.includes('exterior') || text.includes('window')) {
    return 'exterior';
  } else {
    return 'general';
  }
}

exports.down = async function(knex) {
  // This is demo data, so we don't need to remove it specifically
};