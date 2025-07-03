const { knex } = require('../database');

class PropertyManagerService {
  /**
   * Get property health dashboard data
   */
  async getPropertyHealthDashboard(tenantId, options = {}) {
    const { dateRange = 'week', propertyId = null } = options;
    
    // Get active issues by property
    let query = knex('active_issues_by_property')
      .where('tenant_id', tenantId);
    
    if (propertyId) {
      query = query.where('property_id', propertyId);
    }
    
    const propertyIssues = await query;
    
    // Get recent inspections
    const recentInspections = await knex('recent_inspection_results')
      .join('properties', 'recent_inspection_results.property_id', 'properties.id')
      .where('properties.tenant_id', tenantId)
      .whereRaw(`completed_at >= NOW() - INTERVAL '1 ${dateRange}'`)
      .orderBy('completed_at', 'desc')
      .limit(20);
    
    // Get today's metrics
    const todayMetrics = await knex('property_manager_metrics')
      .where('tenant_id', tenantId)
      .where('metric_type', 'property_health')
      .where('metric_date', knex.raw('CURRENT_DATE'))
      .select('*');
    
    // Get properties requiring attention
    const attentionRequired = await knex('property_manager_metrics')
      .join('properties', 'property_manager_metrics.property_id', 'properties.id')
      .where('property_manager_metrics.tenant_id', tenantId)
      .where('requires_attention', true)
      .where('metric_date', knex.raw('CURRENT_DATE'))
      .select(
        'properties.id',
        'properties.name',
        'property_manager_metrics.attention_reasons',
        'property_manager_metrics.open_action_items',
        'property_manager_metrics.overdue_action_items'
      );
    
    return {
      propertyIssues,
      recentInspections,
      todayMetrics,
      attentionRequired
    };
  }

  /**
   * Get detailed checklist completion report
   */
  async getChecklistCompletionReport(tenantId, options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      propertyId = null,
      includePhotos = true 
    } = options;
    
    let query = knex('property_checklists as pc')
      .join('properties as p', 'pc.property_id', 'p.id')
      .join('checklist_templates as ct', 'pc.template_id', 'ct.id')
      .leftJoin('users as u', 'pc.assigned_to', 'u.id')
      .where('p.tenant_id', tenantId)
      .whereBetween('pc.completed_at', [startDate, endDate])
      .whereNotNull('pc.completed_at')
      .select(
        'pc.id',
        'p.name as property_name',
        'ct.name as checklist_name',
        'ct.category',
        'pc.status',
        'pc.completed_at',
        knex.raw("CONCAT(u.first_name, ' ', u.last_name) as completed_by"),
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id) as total_items
        `),
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id 
           AND cr.issue_severity IS NOT NULL 
           AND cr.issue_severity != 'none') as items_with_issues
        `),
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id 
           AND cr.issue_severity IN ('major', 'critical')) as serious_issues
        `),
        knex.raw(`
          (SELECT COUNT(DISTINCT ca.id) 
           FROM checklist_responses cr 
           JOIN checklist_attachments ca ON ca.response_id = cr.id
           WHERE cr.checklist_id = pc.id) as photo_count
        `),
        knex.raw(`
          (SELECT array_agg(
            json_build_object(
              'item_text', ci.item_text,
              'response', cr.response_value,
              'notes', cr.notes,
              'issue_severity', cr.issue_severity,
              'issue_description', cr.issue_description
            ) ORDER BY ci.sort_order
          )
          FROM checklist_responses cr
          JOIN checklist_items ci ON cr.item_id = ci.id
          WHERE cr.checklist_id = pc.id
          AND cr.issue_severity IS NOT NULL 
          AND cr.issue_severity != 'none') as issues_detail
        `)
      );
    
    if (propertyId) {
      query = query.where('p.id', propertyId);
    }
    
    const completions = await query.orderBy('pc.completed_at', 'desc');
    
    // Get summary statistics
    const summary = await knex('property_checklists as pc')
      .join('properties as p', 'pc.property_id', 'p.id')
      .where('p.tenant_id', tenantId)
      .whereBetween('pc.completed_at', [startDate, endDate])
      .whereNotNull('pc.completed_at')
      .select(
        knex.raw('COUNT(*) as total_completed'),
        knex.raw('COUNT(DISTINCT p.id) as properties_inspected'),
        knex.raw('COUNT(DISTINCT pc.assigned_to) as unique_inspectors'),
        knex.raw(`AVG(
          EXTRACT(EPOCH FROM (pc.completed_at - pc.created_at))/3600
        ) as avg_completion_hours`)
      )
      .first();
    
    return {
      completions,
      summary
    };
  }

  /**
   * Get action items report
   */
  async getActionItemsReport(tenantId, options = {}) {
    const { 
      status = null, 
      severity = null, 
      assignedTo = null,
      propertyId = null,
      overdue = false 
    } = options;
    
    let query = knex('action_items as ai')
      .join('properties as p', 'ai.property_id', 'p.id')
      .leftJoin('users as reporter', 'ai.reported_by', 'reporter.id')
      .leftJoin('users as assignee', 'ai.assigned_to', 'assignee.id')
      .leftJoin('checklist_responses as cr', 'ai.checklist_response_id', 'cr.id')
      .leftJoin('property_checklists as pc', 'cr.checklist_id', 'pc.id')
      .where('ai.tenant_id', tenantId)
      .select(
        'ai.*',
        'p.name as property_name',
        knex.raw("CONCAT(reporter.first_name, ' ', reporter.last_name) as reporter_name"),
        knex.raw("CONCAT(assignee.first_name, ' ', assignee.last_name) as assignee_name"),
        'pc.completed_at as inspection_date',
        knex.raw(`
          (SELECT COUNT(*) 
           FROM action_item_updates 
           WHERE action_item_id = ai.id) as update_count
        `),
        knex.raw(`
          (SELECT array_agg(
            json_build_object(
              'created_at', created_at,
              'update_type', update_type,
              'update_note', update_note,
              'updated_by', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = updated_by)
            ) ORDER BY created_at DESC
          )
          FROM action_item_updates
          WHERE action_item_id = ai.id
          LIMIT 5) as recent_updates
        `)
      );
    
    if (status) {
      query = query.where('ai.status', status);
    }
    
    if (severity) {
      query = query.where('ai.severity', severity);
    }
    
    if (assignedTo) {
      query = query.where('ai.assigned_to', assignedTo);
    }
    
    if (propertyId) {
      query = query.where('ai.property_id', propertyId);
    }
    
    if (overdue) {
      query = query.whereRaw('ai.due_date < CURRENT_TIMESTAMP')
        .whereNotIn('ai.status', ['completed', 'cancelled']);
    }
    
    const actionItems = await query.orderBy('ai.priority', 'desc').orderBy('ai.due_date', 'asc');
    
    // Get summary by status and severity
    const summary = await knex('action_items')
      .where('tenant_id', tenantId)
      .select(
        knex.raw(`COUNT(*) FILTER (WHERE status = 'open') as open_count`),
        knex.raw(`COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count`),
        knex.raw(`COUNT(*) FILTER (WHERE status = 'completed') as completed_count`),
        knex.raw(`COUNT(*) FILTER (WHERE severity = 'critical') as critical_count`),
        knex.raw(`COUNT(*) FILTER (WHERE severity = 'major') as major_count`),
        knex.raw(`COUNT(*) FILTER (WHERE severity = 'moderate') as moderate_count`),
        knex.raw(`COUNT(*) FILTER (WHERE severity = 'minor') as minor_count`),
        knex.raw(`SUM(cost) FILTER (WHERE status != 'completed') as estimated_cost`),
        knex.raw(`SUM(cost) FILTER (WHERE status = 'completed') as actual_cost`)
      )
      .first();
    
    return {
      actionItems,
      summary
    };
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformanceReport(tenantId, options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date() 
    } = options;
    
    const staffMetrics = await knex('property_manager_metrics as pmm')
      .join('users as u', 'pmm.user_id', 'u.id')
      .where('pmm.tenant_id', tenantId)
      .where('pmm.metric_type', 'staff_performance')
      .whereBetween('pmm.metric_date', [startDate, endDate])
      .groupBy('u.id', 'u.first_name', 'u.last_name', 'u.role')
      .select(
        'u.id',
        knex.raw("CONCAT(u.first_name, ' ', u.last_name) as full_name"),
        'u.role',
        knex.raw('SUM(pmm.tasks_completed) as total_tasks_completed'),
        knex.raw('SUM(pmm.inspections_performed) as total_inspections'),
        knex.raw('AVG(pmm.avg_inspection_quality) as avg_quality_score'),
        knex.raw('AVG(pmm.on_time_completion_rate) as avg_on_time_rate')
      )
      .orderBy('total_tasks_completed', 'desc');
    
    // Get detailed task breakdown
    const taskBreakdown = await knex('action_items as ai')
      .join('users as u', 'ai.assigned_to', 'u.id')
      .where('ai.tenant_id', tenantId)
      .whereBetween('ai.created_at', [startDate, endDate])
      .groupBy('u.id', 'u.first_name', 'u.last_name', 'ai.status')
      .select(
        'u.id',
        knex.raw("CONCAT(u.first_name, ' ', u.last_name) as full_name"),
        'ai.status',
        knex.raw('COUNT(*) as count'),
        knex.raw('AVG(ai.actual_hours) as avg_hours')
      );
    
    return {
      staffMetrics,
      taskBreakdown
    };
  }

  /**
   * Get recurring issues analysis
   */
  async getRecurringIssuesReport(tenantId, propertyId = null) {
    let query = knex('recurring_issues as ri')
      .join('properties as p', 'ri.property_id', 'p.id')
      .where('ri.tenant_id', tenantId)
      .where('ri.status', 'active')
      .select(
        'ri.*',
        'p.name as property_name',
        knex.raw(`
          EXTRACT(DAYS FROM (ri.last_reported - ri.first_reported)) as days_active
        `)
      );
    
    if (propertyId) {
      query = query.where('ri.property_id', propertyId);
    }
    
    const recurringIssues = await query.orderBy('ri.total_cost', 'desc');
    
    // Get cost impact summary
    const costImpact = await knex('recurring_issues')
      .where('tenant_id', tenantId)
      .where('status', 'active')
      .groupBy('issue_category')
      .select(
        'issue_category',
        knex.raw('SUM(total_cost) as category_cost'),
        knex.raw('SUM(occurrence_count) as total_occurrences'),
        knex.raw('COUNT(DISTINCT property_id) as affected_properties')
      )
      .orderBy('category_cost', 'desc');
    
    return {
      recurringIssues,
      costImpact
    };
  }

  /**
   * Create or update an action item
   */
  async createActionItem(tenantId, actionItemData) {
    const { id, ...data } = actionItemData;
    
    if (id) {
      // Update existing
      const existing = await knex('action_items')
        .where('id', id)
        .where('tenant_id', tenantId)
        .first();
      
      if (!existing) {
        throw new Error('Action item not found');
      }
      
      // Track changes
      const updates = [];
      if (data.status && data.status !== existing.status) {
        updates.push({
          action_item_id: id,
          updated_by: data.updated_by,
          update_type: 'status_change',
          old_value: existing.status,
          new_value: data.status,
          update_note: `Status changed from ${existing.status} to ${data.status}`
        });
        
        if (data.status === 'in_progress' && !existing.started_at) {
          data.started_at = knex.fn.now();
        }
        if (data.status === 'completed' && !existing.completed_at) {
          data.completed_at = knex.fn.now();
        }
      }
      
      if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
        updates.push({
          action_item_id: id,
          updated_by: data.updated_by,
          update_type: 'assignment',
          old_value: existing.assigned_to,
          new_value: data.assigned_to,
          update_note: 'Reassigned to different staff member'
        });
      }
      
      // Save updates
      if (updates.length > 0) {
        await knex('action_item_updates').insert(updates);
      }
      
      await knex('action_items')
        .where('id', id)
        .update({
          ...data,
          tenant_id,
          updated_at: knex.fn.now()
        });
      
      return { id, ...data };
    } else {
      // Create new
      const [newId] = await knex('action_items')
        .insert({
          ...data,
          tenant_id,
          status: 'open',
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        })
        .returning('id');
      
      return { id: newId, ...data };
    }
  }

  /**
   * Add update/note to action item
   */
  async addActionItemUpdate(tenantId, actionItemId, update) {
    const actionItem = await knex('action_items')
      .where('id', actionItemId)
      .where('tenant_id', tenantId)
      .first();
    
    if (!actionItem) {
      throw new Error('Action item not found');
    }
    
    await knex('action_item_updates').insert({
      action_item_id: actionItemId,
      ...update,
      created_at: knex.fn.now()
    });
    
    return { success: true };
  }

  /**
   * Get inspection summary for a property
   */
  async getPropertyInspectionSummary(tenantId, propertyId, dateRange = 30) {
    const summaries = await knex('property_inspection_summary')
      .where('tenant_id', tenantId)
      .where('property_id', propertyId)
      .whereRaw(`inspection_date >= CURRENT_DATE - INTERVAL '${dateRange} days'`)
      .orderBy('inspection_date', 'desc');
    
    const aggregates = await knex('property_inspection_summary')
      .where('tenant_id', tenantId)
      .where('property_id', propertyId)
      .whereRaw(`inspection_date >= CURRENT_DATE - INTERVAL '${dateRange} days'`)
      .select(
        knex.raw('AVG(completion_percentage) as avg_completion'),
        knex.raw('SUM(critical_issues + major_issues) as total_serious_issues'),
        knex.raw('SUM(estimated_repair_cost) as total_estimated_cost'),
        knex.raw('AVG(quality_score) as avg_quality_score')
      )
      .first();
    
    return {
      summaries,
      aggregates
    };
  }

  /**
   * Get comprehensive property audit data with checklist details
   */
  async getPropertyAuditData(tenantId, options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      propertyId = null,
      status = null,
      assignedTo = null
    } = options;

    // Get property checklist completion data
    let checklistQuery = knex('property_checklists as pc')
      .join('properties as p', 'pc.property_id', 'p.id')
      .join('checklist_templates as ct', 'pc.template_id', 'ct.id')
      .leftJoin('users as assignee', 'pc.assigned_to', 'assignee.id')
      .leftJoin('users as creator', 'ct.created_by', 'creator.id')
      .where('p.tenant_id', tenantId)
      .select(
        'pc.id as checklist_id',
        'pc.property_id',
        'p.name as property_name',
        'p.address as property_address',
        'ct.id as template_id',
        'ct.name as template_name',
        'ct.category',
        'pc.status',
        'pc.due_date',
        'pc.created_at',
        'pc.completed_at',
        knex.raw("CONCAT(assignee.first_name, ' ', assignee.last_name) as assigned_to_name"),
        'assignee.email as assigned_to_email',
        knex.raw("CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name"),
        
        // Get completion percentage
        knex.raw(`
          COALESCE(
            ROUND(
              (SELECT COUNT(*) * 100.0 / NULLIF(
                (SELECT COUNT(*) FROM checklist_items WHERE template_id = ct.id), 0
              )
              FROM checklist_responses cr 
              WHERE cr.checklist_id = pc.id 
              AND cr.completed_at IS NOT NULL),
            0), 0
          ) as completion_percentage
        `),
        
        // Get item counts
        knex.raw(`
          (SELECT COUNT(*) FROM checklist_items WHERE template_id = ct.id) as total_items
        `),
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id 
           AND cr.completed_at IS NOT NULL) as completed_items
        `),
        
        // Get issue counts
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id 
           AND cr.issue_severity IS NOT NULL 
           AND cr.issue_severity != 'none') as items_with_issues
        `),
        knex.raw(`
          (SELECT COUNT(*) 
           FROM checklist_responses cr 
           WHERE cr.checklist_id = pc.id 
           AND cr.issue_severity IN ('major', 'critical')) as critical_issues
        `),
        
        // Get attachment count
        knex.raw(`
          (SELECT COUNT(DISTINCT ca.id) 
           FROM checklist_responses cr 
           JOIN checklist_attachments ca ON ca.response_id = cr.id
           WHERE cr.checklist_id = pc.id) as attachment_count
        `),
        
        // Get last activity
        knex.raw(`
          (SELECT MAX(GREATEST(
            cr.completed_at, 
            cr.created_at,
            (SELECT MAX(created_at) FROM checklist_comments WHERE response_id = cr.id)
          ))
          FROM checklist_responses cr
          WHERE cr.checklist_id = pc.id) as last_activity
        `)
      );

    // Apply filters
    if (propertyId) {
      checklistQuery = checklistQuery.where('pc.property_id', propertyId);
    }
    
    if (status) {
      checklistQuery = checklistQuery.where('pc.status', status);
    }
    
    if (assignedTo) {
      checklistQuery = checklistQuery.where('pc.assigned_to', assignedTo);
    }
    
    // Date range filter
    checklistQuery = checklistQuery.where(function() {
      this.whereBetween('pc.created_at', [startDate, endDate])
        .orWhereBetween('pc.completed_at', [startDate, endDate]);
    });

    const checklists = await checklistQuery.orderBy('pc.created_at', 'desc');

    // Get detailed checklist items for each checklist
    const checklistIds = checklists.map(c => c.checklist_id);
    
    let itemDetails = [];
    if (checklistIds.length > 0) {
      itemDetails = await knex('checklist_responses as cr')
        .join('checklist_items as ci', 'cr.item_id', 'ci.id')
        .leftJoin('users as u', 'cr.completed_by', 'u.id')
        .whereIn('cr.checklist_id', checklistIds)
        .select(
          'cr.checklist_id',
          'ci.item_text',
          'ci.item_type',
          'ci.is_required',
          'cr.response_value',
          'cr.notes',
          'cr.issue_severity',
          'cr.issue_description',
          'cr.completed_at as item_completed_at',
          knex.raw("CONCAT(u.first_name, ' ', u.last_name) as completed_by_name"),
          'u.email as completed_by_email',
          knex.raw(`
            (SELECT COUNT(*) 
             FROM checklist_attachments 
             WHERE response_id = cr.id) as attachments
          `),
          knex.raw(`
            (SELECT COUNT(*) 
             FROM checklist_comments 
             WHERE response_id = cr.id) as comments
          `)
        )
        .orderBy('ci.sort_order');
    }

    // Get summary statistics
    const summary = await knex('property_checklists as pc')
      .join('properties as p', 'pc.property_id', 'p.id')
      .where('p.tenant_id', tenantId)
      .where(function() {
        this.whereBetween('pc.created_at', [startDate, endDate])
          .orWhereBetween('pc.completed_at', [startDate, endDate]);
      })
      .select(
        knex.raw('COUNT(DISTINCT pc.id) as total_checklists'),
        knex.raw('COUNT(DISTINCT pc.property_id) as total_properties'),
        knex.raw(`COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'completed') as completed_checklists`),
        knex.raw(`COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'pending') as pending_checklists`),
        knex.raw(`COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'in_progress') as in_progress_checklists`),
        knex.raw(`COUNT(DISTINCT pc.id) FILTER (WHERE pc.due_date < CURRENT_TIMESTAMP AND pc.status != 'completed') as overdue_checklists`)
      )
      .first();

    // Get recent audit activity related to checklists
    const auditActivity = await knex('audit_logs as al')
      .join('audit_event_types as aet', 'al.event_type_id', 'aet.id')
      .leftJoin('users as u', 'al.user_id', 'u.id')
      .where('al.tenant_id', tenantId)
      .where('aet.category', 'checklist')
      .whereBetween('al.created_at', [startDate, endDate])
      .select(
        'al.id',
        'al.action',
        'al.description',
        'al.entity_id',
        'al.property_id',
        'al.created_at',
        knex.raw("CONCAT(u.first_name, ' ', u.last_name) as user_name"),
        'u.email as user_email',
        'al.metadata'
      )
      .orderBy('al.created_at', 'desc')
      .limit(100);

    // Group item details by checklist
    const itemDetailsByChecklist = {};
    itemDetails.forEach(item => {
      if (!itemDetailsByChecklist[item.checklist_id]) {
        itemDetailsByChecklist[item.checklist_id] = [];
      }
      itemDetailsByChecklist[item.checklist_id].push(item);
    });

    // Combine data
    const checklistsWithDetails = checklists.map(checklist => ({
      ...checklist,
      items: itemDetailsByChecklist[checklist.checklist_id] || []
    }));

    return {
      checklists: checklistsWithDetails,
      summary,
      auditActivity,
      filters: {
        startDate,
        endDate,
        propertyId,
        status,
        assignedTo
      }
    };
  }
}

module.exports = new PropertyManagerService();