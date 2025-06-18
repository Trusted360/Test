const express = require('express');
const router = express.Router();
const knex = require('../config/database');

// GET /api/checklists/templates - Get all checklist templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await knex('checklist_templates')
      .where('is_active', true)
      .orderBy('name');

    // Get item count for each template
    for (let template of templates) {
      const itemCount = await knex('checklist_items')
        .where('template_id', template.id)
        .count('id as count')
        .first();
      template.item_count = parseInt(itemCount.count) || 0;
    }

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist templates',
      error: error.message
    });
  }
});

// GET /api/checklists/templates/:id - Get specific template with items
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await knex('checklist_templates')
      .where('id', id)
      .where('is_active', true)
      .first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get template items
    const items = await knex('checklist_items')
      .where('template_id', id)
      .orderBy('sort_order');

    template.items = items;

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching checklist template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist template',
      error: error.message
    });
  }
});

// POST /api/checklists - Create new checklist from template
router.post('/', async (req, res) => {
  const trx = await knex.transaction();
  
  try {
    const { property_id, template_id, assigned_to, due_date, notes } = req.body;
    const user_id = req.user?.id || 1; // Default to admin for now

    // Verify template exists
    const template = await trx('checklist_templates')
      .where('id', template_id)
      .where('is_active', true)
      .first();

    if (!template) {
      await trx.rollback();
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Create checklist
    const [checklist] = await trx('property_checklists')
      .insert({
        property_id,
        template_id,
        assigned_to: assigned_to || user_id,
        created_by: user_id,
        due_date,
        status: 'pending',
        tenant_id: req.user?.tenant_id || 'default'
      })
      .returning('*');

    await trx.commit();

    res.status(201).json({
      success: true,
      data: checklist,
      message: 'Checklist created successfully'
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error creating checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checklist',
      error: error.message
    });
  }
});

// GET /api/checklists - Get all checklists
router.get('/', async (req, res) => {
  try {
    const { property_id, status, assigned_to } = req.query;
    
    let query = knex('property_checklists as pc')
      .select(
        'pc.*',
        'p.name as property_name',
        'ct.name as template_name',
        'u.name as assigned_to_name'
      )
      .leftJoin('properties as p', 'pc.property_id', 'p.id')
      .leftJoin('checklist_templates as ct', 'pc.template_id', 'ct.id')
      .leftJoin('users as u', 'pc.assigned_to', 'u.id')
      .orderBy('pc.created_at', 'desc');

    if (property_id) query = query.where('pc.property_id', property_id);
    if (status) query = query.where('pc.status', status);
    if (assigned_to) query = query.where('pc.assigned_to', assigned_to);

    const checklists = await query;

    res.json({
      success: true,
      data: checklists,
      count: checklists.length
    });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklists',
      error: error.message
    });
  }
});

// GET /api/checklists/:id - Get specific checklist with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checklist = await knex('property_checklists as pc')
      .select(
        'pc.*',
        'p.name as property_name',
        'ct.name as template_name',
        'u.name as assigned_to_name'
      )
      .leftJoin('properties as p', 'pc.property_id', 'p.id')
      .leftJoin('checklist_templates as ct', 'pc.template_id', 'ct.id')
      .leftJoin('users as u', 'pc.assigned_to', 'u.id')
      .where('pc.id', id)
      .first();

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Checklist not found'
      });
    }

    // Get checklist items with responses
    const items = await knex('checklist_items as ci')
      .select(
        'ci.*',
        'cr.id as response_id',
        'cr.response_value',
        'cr.completed_at',
        'cr.completed_by',
        'u.name as completed_by_name'
      )
      .leftJoin('checklist_responses as cr', function() {
        this.on('ci.id', '=', 'cr.item_id')
            .andOn('cr.checklist_id', '=', knex.raw('?', [checklist.id]));
      })
      .leftJoin('users as u', 'cr.completed_by', 'u.id')
      .where('ci.template_id', checklist.template_id)
      .orderBy('ci.sort_order');

    checklist.items = items;

    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist',
      error: error.message
    });
  }
});

// PUT /api/checklists/:id/status - Update checklist status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const [checklist] = await knex('property_checklists')
      .where('id', id)
      .update({ status, updated_at: new Date() })
      .returning('*');

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Checklist not found'
      });
    }

    res.json({
      success: true,
      data: checklist,
      message: 'Checklist status updated successfully'
    });
  } catch (error) {
    console.error('Error updating checklist status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist status',
      error: error.message
    });
  }
});

// POST /api/checklists/:id/items/:itemId/complete - Complete checklist item
router.post('/:id/items/:itemId/complete', async (req, res) => {
  const trx = await knex.transaction();
  
  try {
    const { id: checklistId, itemId } = req.params;
    const { response_value, notes } = req.body;
    const userId = req.user?.id || 1;

    // Check if response already exists
    const existingResponse = await trx('checklist_responses')
      .where('checklist_id', checklistId)
      .where('item_id', itemId)
      .first();

    let response;
    if (existingResponse) {
      // Update existing response
      [response] = await trx('checklist_responses')
        .where('id', existingResponse.id)
        .update({
          response_value,
          notes,
          completed_at: new Date(),
          completed_by: userId
        })
        .returning('*');
    } else {
      // Create new response
      [response] = await trx('checklist_responses')
        .insert({
          checklist_id: checklistId,
          item_id: itemId,
          response_value,
          notes,
          completed_at: new Date(),
          completed_by: userId
        })
        .returning('*');
    }

    // Update checklist status to in_progress if it was pending
    await trx('property_checklists')
      .where('id', checklistId)
      .where('status', 'pending')
      .update({ status: 'in_progress' });

    await trx.commit();

    res.json({
      success: true,
      data: response,
      message: 'Item completed successfully'
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error completing checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete checklist item',
      error: error.message
    });
  }
});

module.exports = router;
