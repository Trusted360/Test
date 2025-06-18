/**
 * Add video event-specific checklist templates
 * These templates are designed to be used when creating checklists from video alerts
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Get admin user for created_by reference
  const adminUser = await knex('users').where('email', 'admin@trusted360.com').first();
  
  if (!adminUser) {
    console.log('⚠️  Admin user not found, skipping video event checklist templates');
    return;
  }

  // Insert video event-specific checklist templates
  const templateIds = await knex('checklist_templates').insert([
    {
      name: 'Video Event Response - Security',
      description: 'Standard response checklist for security-related video events',
      property_type: null, // Applies to all property types
      is_active: true,
      created_by: adminUser.id,
      tenant_id: 'default'
    },
    {
      name: 'Video Event Response - Maintenance',
      description: 'Standard response checklist for maintenance-related video events (water leaks, equipment issues)',
      property_type: null,
      is_active: true,
      created_by: adminUser.id,
      tenant_id: 'default'
    },
    {
      name: 'Video Event Response - Emergency',
      description: 'Emergency response checklist for critical video events (fire, medical, etc)',
      property_type: null,
      is_active: true,
      created_by: adminUser.id,
      tenant_id: 'default'
    }
  ]).returning('id');

  console.log('✅ Created video event checklist templates');

  // Get the template IDs
  const templates = await knex('checklist_templates')
    .whereIn('name', [
      'Video Event Response - Security',
      'Video Event Response - Maintenance',
      'Video Event Response - Emergency'
    ])
    .select('id', 'name');

  const securityTemplate = templates.find(t => t.name === 'Video Event Response - Security');
  const maintenanceTemplate = templates.find(t => t.name === 'Video Event Response - Maintenance');
  const emergencyTemplate = templates.find(t => t.name === 'Video Event Response - Emergency');

  // Insert checklist items for each template
  const checklistItems = [];

  // Security template items
  if (securityTemplate) {
    checklistItems.push(
      {
        template_id: securityTemplate.id,
        item_text: 'Review video footage of the incident',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: securityTemplate.id,
        item_text: 'Document time and location of incident',
        item_type: 'text',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: securityTemplate.id,
        item_text: 'Contact security personnel if needed',
        item_type: 'checkbox',
        is_required: false,
        sort_order: 3
      },
      {
        template_id: securityTemplate.id,
        item_text: 'Take screenshots of relevant video frames',
        item_type: 'file_upload',
        is_required: false,
        sort_order: 4,
        config_json: JSON.stringify({ accept: 'image/*', maxFiles: 10 })
      },
      {
        template_id: securityTemplate.id,
        item_text: 'File incident report if necessary',
        item_type: 'checkbox',
        is_required: false,
        sort_order: 5
      },
      {
        template_id: securityTemplate.id,
        item_text: 'Additional notes and observations',
        item_type: 'text',
        is_required: false,
        sort_order: 6
      },
      {
        template_id: securityTemplate.id,
        item_text: 'Responder signature',
        item_type: 'signature',
        is_required: true,
        sort_order: 7
      }
    );
  }

  // Maintenance template items
  if (maintenanceTemplate) {
    checklistItems.push(
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Assess severity of the issue',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Document location and extent of damage',
        item_type: 'text',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Take photos of the affected area',
        item_type: 'photo',
        is_required: true,
        sort_order: 3
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Shut off utilities if necessary (water, gas, electricity)',
        item_type: 'checkbox',
        is_required: false,
        sort_order: 4
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Contact maintenance team',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 5
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Estimated repair cost',
        item_type: 'text',
        is_required: false,
        sort_order: 6
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Temporary measures taken',
        item_type: 'text',
        is_required: false,
        sort_order: 7
      },
      {
        template_id: maintenanceTemplate.id,
        item_text: 'Technician signature',
        item_type: 'signature',
        is_required: true,
        sort_order: 8
      }
    );
  }

  // Emergency template items
  if (emergencyTemplate) {
    checklistItems.push(
      {
        template_id: emergencyTemplate.id,
        item_text: 'Call 911 if immediate danger',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'Evacuate area if necessary',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'Time emergency services contacted',
        item_type: 'text',
        is_required: false,
        sort_order: 3
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'Document all affected areas/units',
        item_type: 'text',
        is_required: true,
        sort_order: 4
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'Take photos for insurance/documentation',
        item_type: 'file_upload',
        is_required: false,
        sort_order: 5,
        config_json: JSON.stringify({ accept: 'image/*', maxFiles: 20 })
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'List of people notified',
        item_type: 'text',
        is_required: true,
        sort_order: 6
      },
      {
        template_id: emergencyTemplate.id,
        item_text: 'Incident commander signature',
        item_type: 'signature',
        is_required: true,
        sort_order: 7
      }
    );
  }

  // Insert all checklist items
  if (checklistItems.length > 0) {
    await knex('checklist_items').insert(checklistItems);
    console.log('✅ Created checklist items for video event templates');
  }

  console.log('🎉 Video event checklist templates created successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // First delete the checklist items
  const templateIds = await knex('checklist_templates')
    .whereIn('name', [
      'Video Event Response - Security',
      'Video Event Response - Maintenance',
      'Video Event Response - Emergency'
    ])
    .pluck('id');

  if (templateIds.length > 0) {
    await knex('checklist_items').whereIn('template_id', templateIds).del();
  }

  // Then delete the templates
  await knex('checklist_templates')
    .whereIn('name', [
      'Video Event Response - Security',
      'Video Event Response - Maintenance',
      'Video Event Response - Emergency'
    ])
    .del();

  console.log('🗑️  Removed video event checklist templates');
};
