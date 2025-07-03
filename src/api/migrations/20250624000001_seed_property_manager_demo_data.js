/**
 * Seed demo data for property manager reporting
 * Creates realistic inspection data with issues and action items
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Get some existing data to work with
  const properties = await knex('properties').select('id', 'name').limit(3);
  const users = await knex('users').select('id', 'email', 'first_name', 'last_name').limit(5);
  const templates = await knex('checklist_templates').select('id', 'name').limit(3);
  
  if (properties.length === 0 || users.length === 0 || templates.length === 0) {
    console.log('Skipping property manager demo data - base data not available');
    return;
  }

  // Update some existing checklist responses with issues
  const recentChecklists = await knex('property_checklists')
    .where('status', 'completed')
    .orderBy('completed_at', 'desc')
    .limit(10);

  for (const checklist of recentChecklists) {
    const responses = await knex('checklist_responses')
      .where('checklist_id', checklist.id)
      .limit(5);

    // Add issues to some responses
    for (let i = 0; i < responses.length; i++) {
      if (i % 2 === 0) { // 50% of items have issues
        const severities = ['minor', 'moderate', 'major', 'critical'];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const requiresAction = severity !== 'minor';

        await knex('checklist_responses')
          .where('id', responses[i].id)
          .update({
            issue_severity: severity,
            requires_action: requiresAction,
            issue_description: getIssueDescription(severity),
            issue_metadata: JSON.stringify({
              location: `Unit ${Math.floor(Math.random() * 100) + 1}`,
              estimated_cost: getEstimatedCost(severity),
              photos_required: requiresAction
            })
          });

        // Create action items for issues requiring action
        if (requiresAction) {
          const actionItem = {
            checklist_response_id: responses[i].id,
            property_id: checklist.property_id,
            title: getActionTitle(severity),
            description: getActionDescription(severity),
            severity: severity,
            category: getIssueCategory(),
            reported_by: checklist.assigned_to,
            assigned_to: users[Math.floor(Math.random() * users.length)].id,
            status: getRandomStatus(),
            priority: getPriorityFromSeverity(severity),
            due_date: getDueDate(severity),
            estimated_hours: getEstimatedHours(severity),
            cost: getEstimatedCost(severity)
          };

          const [actionId] = await knex('action_items').insert(actionItem).returning('id');

          // Add some updates to action items
          if (actionItem.status !== 'open') {
            await knex('action_item_updates').insert({
              action_item_id: actionId,
              updated_by: actionItem.assigned_to,
              update_type: 'status_change',
              update_note: 'Started working on this issue',
              old_value: 'open',
              new_value: actionItem.status
            });
          }
        }
      }
    }
  }

  // Create inspection summaries for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const property of properties) {
    for (let daysAgo = 0; daysAgo < 30; daysAgo += 7) {
      const inspectionDate = new Date();
      inspectionDate.setDate(inspectionDate.getDate() - daysAgo);

      const summary = {
        property_id: property.id,
        inspection_date: inspectionDate.toISOString().split('T')[0],
        inspection_type: daysAgo === 0 ? 'weekly' : 'weekly',
        total_items: 25,
        completed_items: 23 + Math.floor(Math.random() * 2),
        failed_items: Math.floor(Math.random() * 3),
        items_with_issues: 2 + Math.floor(Math.random() * 4),
        completion_percentage: 92 + Math.floor(Math.random() * 8),
        critical_issues: Math.random() > 0.8 ? 1 : 0,
        major_issues: Math.floor(Math.random() * 2),
        moderate_issues: Math.floor(Math.random() * 3),
        minor_issues: Math.floor(Math.random() * 4),
        action_items_created: Math.floor(Math.random() * 5),
        action_items_resolved: Math.floor(Math.random() * 3),
        estimated_repair_cost: Math.random() * 5000,
        inspection_duration_minutes: 30 + Math.floor(Math.random() * 30),
        inspector_id: users[Math.floor(Math.random() * users.length)].id,
        quality_score: 85 + Math.floor(Math.random() * 15),
        meets_compliance: Math.random() > 0.1
      };

      await knex('property_inspection_summary').insert(summary);
    }
  }

  // Create some recurring issues
  const recurringIssues = [
    {
      issue_category: 'plumbing',
      issue_pattern: 'Recurring toilet leak in unit bathrooms',
      occurrence_count: 5,
      total_cost: 2500,
      root_cause_analysis: 'Old plumbing fixtures reaching end of life',
      prevention_recommendation: 'Schedule preventive replacement of all toilet valves',
      status: 'active'
    },
    {
      issue_category: 'electrical',
      issue_pattern: 'Parking lot lights frequently burning out',
      occurrence_count: 8,
      total_cost: 1200,
      root_cause_analysis: 'Voltage fluctuations causing premature bulb failure',
      prevention_recommendation: 'Install voltage regulators and switch to LED bulbs',
      status: 'monitoring'
    },
    {
      issue_category: 'security',
      issue_pattern: 'Gate sensor false alarms during rain',
      occurrence_count: 12,
      total_cost: 600,
      root_cause_analysis: 'Water intrusion into sensor housing',
      prevention_recommendation: 'Replace sensor housing with weatherproof model',
      status: 'active'
    }
  ];

  for (const property of properties) {
    for (const issue of recurringIssues) {
      await knex('recurring_issues').insert({
        ...issue,
        property_id: property.id
      });
    }
  }

  // Create property manager metrics for today
  const today = new Date().toISOString().split('T')[0];
  
  for (const property of properties) {
    // Property metrics
    const actionItems = await knex('action_items')
      .where('property_id', property.id)
      .select('status', 'due_date');

    await knex('property_manager_metrics').insert({
      property_id: property.id,
      metric_type: 'property_health',
      metric_date: today,
      open_action_items: actionItems.filter(ai => ai.status === 'open').length,
      overdue_action_items: actionItems.filter(ai => 
        ai.status !== 'completed' && 
        ai.due_date && 
        new Date(ai.due_date) < new Date()
      ).length,
      inspections_completed: Math.floor(Math.random() * 5) + 1,
      inspections_missed: Math.random() > 0.7 ? 1 : 0,
      property_score: 75 + Math.floor(Math.random() * 25),
      new_issues_reported: Math.floor(Math.random() * 5),
      issues_resolved: Math.floor(Math.random() * 3),
      avg_resolution_hours: 24 + Math.floor(Math.random() * 48),
      issue_cost_total: Math.random() * 5000,
      compliance_violations: Math.random() > 0.8 ? 1 : 0,
      safety_incidents: 0,
      requires_attention: actionItems.filter(ai => ai.status === 'open').length > 5,
      attention_reasons: JSON.stringify(
        actionItems.filter(ai => ai.status === 'open').length > 5 
          ? ['High number of open issues', 'Overdue critical items']
          : []
      )
    });
  }

  // Staff performance metrics
  for (const user of users) {
    await knex('property_manager_metrics').insert({
      user_id: user.id,
      metric_type: 'staff_performance',
      metric_date: today,
      tasks_completed: Math.floor(Math.random() * 10) + 5,
      inspections_performed: Math.floor(Math.random() * 5) + 1,
      avg_inspection_quality: 80 + Math.floor(Math.random() * 20),
      on_time_completion_rate: 85 + Math.floor(Math.random() * 15)
    });
  }

  console.log('Property manager demo data seeded successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Clean up in reverse order
  await knex('property_manager_metrics').del();
  await knex('recurring_issues').del();
  await knex('property_inspection_summary').del();
  await knex('action_item_updates').del();
  await knex('action_items').del();
  
  // Reset checklist response fields
  await knex('checklist_responses').update({
    issue_severity: null,
    requires_action: false,
    issue_description: null,
    issue_metadata: null
  });
};

// Helper functions for generating realistic data
function getIssueDescription(severity) {
  const descriptions = {
    minor: [
      'Light bulb needs replacement',
      'Minor paint scuff on wall',
      'Trash bin needs emptying'
    ],
    moderate: [
      'Cracked window pane',
      'Slow drain in bathroom',
      'Door handle loose'
    ],
    major: [
      'HVAC unit not cooling properly',
      'Large water stain on ceiling',
      'Security camera offline'
    ],
    critical: [
      'Fire extinguisher missing',
      'Emergency exit blocked',
      'Electrical panel showing burn marks'
    ]
  };
  
  const options = descriptions[severity];
  return options[Math.floor(Math.random() * options.length)];
}

function getActionTitle(severity) {
  const titles = {
    minor: 'Minor maintenance required',
    moderate: 'Maintenance needed',
    major: 'Urgent repair required',
    critical: 'CRITICAL: Immediate action required'
  };
  return titles[severity];
}

function getActionDescription(severity) {
  return `${getIssueDescription(severity)}. This issue requires ${severity} attention and should be addressed according to priority guidelines.`;
}

function getIssueCategory() {
  const categories = ['electrical', 'plumbing', 'safety', 'security', 'maintenance', 'compliance'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomStatus() {
  const statuses = ['open', 'open', 'in_progress', 'completed'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getPriorityFromSeverity(severity) {
  const mapping = {
    minor: 'low',
    moderate: 'medium',
    major: 'high',
    critical: 'urgent'
  };
  return mapping[severity];
}

function getDueDate(severity) {
  const daysFromNow = {
    minor: 30,
    moderate: 14,
    major: 7,
    critical: 1
  };
  
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow[severity]);
  return date.toISOString();
}

function getEstimatedHours(severity) {
  const hours = {
    minor: 1,
    moderate: 4,
    major: 8,
    critical: 2
  };
  return hours[severity];
}

function getEstimatedCost(severity) {
  const costs = {
    minor: 50 + Math.random() * 150,
    moderate: 200 + Math.random() * 300,
    major: 500 + Math.random() * 1500,
    critical: 1000 + Math.random() * 2000
  };
  return Math.round(costs[severity]);
}