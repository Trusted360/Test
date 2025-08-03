/**
 * Simple SOP Model - mirrors checklist pattern exactly
 * Handles basic CRUD operations for SOPs with property assignment
 */

class SOPModel {
  constructor(db) {
    this.db = db;
  }

  // ===== SOP Templates (like checklist_templates) =====

  /**
   * Get all SOP templates with optional filtering
   */
  async getSOPTemplates(tenantId, filters = {}) {
    let query = this.db('sop_templates')
      .where('tenant_id', tenantId)
      .where('is_active', true)
      .orderBy('created_at', 'desc');

    if (filters.search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${filters.search}%`)
            .orWhere('description', 'ilike', `%${filters.search}%`);
      });
    }

    if (filters.category) {
      query = query.where('category', filters.category);
    }

    return await query;
  }

  /**
   * Get SOP template by ID with items
   */
  async getSOPTemplateById(id, tenantId) {
    const template = await this.db('sop_templates')
      .where({ id, tenant_id: tenantId })
      .first();

    if (!template) {
      throw new Error('SOP template not found');
    }

    // Get SOP items
    template.items = await this.db('sop_items')
      .where('template_id', id)
      .orderBy('sort_order', 'asc');

    return template;
  }

  /**
   * Create new SOP template
   */
  async createSOPTemplate(templateData, tenantId, userId) {
    const insertData = {
      ...templateData,
      tenant_id: tenantId,
      created_by: userId,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    };

    const [template] = await this.db('sop_templates')
      .insert(insertData)
      .returning('*');

    return template;
  }

  /**
   * Update SOP template
   */
  async updateSOPTemplate(id, templateData, tenantId) {
    const { items, ...templateFields } = templateData;

    return this.db.transaction(async trx => {
      // Update the template fields
      const [updatedTemplate] = await trx('sop_templates')
        .where({ id, tenant_id: tenantId })
        .update({
          ...templateFields,
          updated_at: this.db.fn.now()
        })
        .returning('*');

      if (!updatedTemplate) {
        throw new Error('SOP template not found or you do not have permission to update it.');
      }

      // Delete existing items
      await trx('sop_items')
        .where('template_id', id)
        .del();

      // Insert new items if provided
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          template_id: id
        }));
        await trx('sop_items').insert(itemsToInsert);
      }

      // Return the updated template with its new items
      const updatedItems = await trx('sop_items')
        .where('template_id', id)
        .orderBy('sort_order', 'asc');
      
      updatedTemplate.items = updatedItems;
      return updatedTemplate;
    });
  }

  /**
   * Delete SOP template
   */
  async deleteSOPTemplate(id, tenantId) {
    return await this.db('sop_templates')
      .where({ id, tenant_id: tenantId })
      .del();
  }

  // ===== SOP Items (like checklist_items) =====

  /**
   * Add item to SOP template
   */
  async addSOPItem(templateId, itemData) {
    const insertData = {
      template_id: templateId,
      ...itemData
    };

    const [item] = await this.db('sop_items')
      .insert(insertData)
      .returning('*');

    return item;
  }

  /**
   * Update SOP item
   */
  async updateSOPItem(id, itemData) {
    const [item] = await this.db('sop_items')
      .where('id', id)
      .update(itemData)
      .returning('*');

    return item;
  }

  /**
   * Delete SOP item
   */
  async deleteSOPItem(id) {
    return await this.db('sop_items')
      .where('id', id)
      .del();
  }

  // ===== Property SOPs (like property_checklists) =====

  /**
   * Get SOPs for a specific property
   */
  async getPropertySOPs(propertyId, filters = {}) {
    let query = this.db('property_sops')
      .join('sop_templates', 'property_sops.template_id', 'sop_templates.id')
      .join('properties', 'property_sops.property_id', 'properties.id')
      .leftJoin('users', 'property_sops.assigned_to', 'users.id')
      .where('property_sops.property_id', propertyId)
      .select(
        'property_sops.*',
        'sop_templates.name as template_name',
        'sop_templates.description as template_description',
        'sop_templates.category',
        'properties.name as property_name',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('property_sops.created_at', 'desc');

    if (filters.status) {
      query = query.where('property_sops.status', filters.status);
    }

    if (filters.assigned_to) {
      query = query.where('property_sops.assigned_to', filters.assigned_to);
    }

    return await query;
  }

  /**
   * Create property SOP assignment
   */
  async createPropertySOP(propertyId, templateId, assignedTo, dueDate = null) {
    const insertData = {
      property_id: propertyId,
      template_id: templateId,
      assigned_to: assignedTo,
      due_date: dueDate,
      status: 'pending',
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    };

    const [propertySOP] = await this.db('property_sops')
      .insert(insertData)
      .returning('*');

    return propertySOP;
  }

  /**
   * Update property SOP
   */
  async updatePropertySOP(id, updateData) {
    const data = {
      ...updateData,
      updated_at: this.db.fn.now()
    };

    const [propertySOP] = await this.db('property_sops')
      .where('id', id)
      .update(data)
      .returning('*');

    return propertySOP;
  }

  /**
   * Get property SOP by ID with responses
   */
  async getPropertySOPById(id) {
    const propertySOP = await this.db('property_sops')
      .join('sop_templates', 'property_sops.template_id', 'sop_templates.id')
      .leftJoin('users', 'property_sops.assigned_to', 'users.id')
      .where('property_sops.id', id)
      .select(
        'property_sops.*',
        'sop_templates.name as template_name',
        'sop_templates.description as template_description',
        'users.first_name',
        'users.last_name'
      )
      .first();

    if (!propertySOP) {
      throw new Error('Property SOP not found');
    }

    // Get template items and responses
    const items = await this.db('sop_items')
      .where('template_id', propertySOP.template_id)
      .orderBy('sort_order', 'asc');

    const responses = await this.db('sop_responses')
      .where('sop_id', id);

    // Merge responses with items
    propertySOP.items = items.map(item => {
      const response = responses.find(r => r.item_id === item.id);
      return {
        ...item,
        response: response || null
      };
    });

    return propertySOP;
  }

  // ===== SOP Responses =====

  /**
   * Save SOP item response
   */
  async saveSOPResponse(sopId, itemId, responseData, userId) {
    const insertData = {
      sop_id: sopId,
      item_id: itemId,
      response_value: responseData.response_value,
      notes: responseData.notes,
      completed_by: userId,
      completed_at: this.db.fn.now()
    };

    const [response] = await this.db('sop_responses')
      .insert(insertData)
      .returning('*');

    return response;
  }

  /**
   * Update SOP item response
   */
  async updateSOPResponse(responseId, responseData) {
    const [response] = await this.db('sop_responses')
      .where('id', responseId)
      .update(responseData)
      .returning('*');

    return response;
  }
}

module.exports = SOPModel;