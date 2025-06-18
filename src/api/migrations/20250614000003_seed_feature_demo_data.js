/**
 * Seed demo data for all three feature systems
 * Creates realistic data for Property Checklists, Video Analysis, and LLM Chatbot
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Get demo users for foreign key references
  const adminUser = await knex('users').where('email', 'admin@trusted360.com').first();
  const demoUser = await knex('users').where('email', 'user@trusted360.com').first();
  
  if (!adminUser || !demoUser) {
    console.log('⚠️  Demo users not found, skipping feature seed data');
    return;
  }

  // SEED PROPERTIES
  const existingProperties = await knex('properties').select('id').limit(1);
  if (existingProperties.length === 0) {
    // Get property type IDs for foreign key references
    const commercialType = await knex('property_types').where('code', 'commercial').first();
    const residentialType = await knex('property_types').where('code', 'residential').first();
    const industrialType = await knex('property_types').where('code', 'industrial').first();
    
    const propertyIds = await knex('properties').insert([
      {
        name: 'Downtown Office Complex',
        address: '123 Business Ave, Downtown, TX 75201',
        property_type_id: commercialType?.id,
        status: 'active',
        tenant_id: 'default'
      },
      {
        name: 'Riverside Apartments',
        address: '456 River St, Riverside, TX 75202',
        property_type_id: residentialType?.id,
        status: 'active',
        tenant_id: 'default'
      },
      {
        name: 'Industrial Warehouse',
        address: '789 Industrial Blvd, Industrial District, TX 75203',
        property_type_id: industrialType?.id,
        status: 'active',
        tenant_id: 'default'
      }
    ]).returning('id');
    
    console.log('✅ Created demo properties');
  }

  // Get property IDs for further seeding
  const properties = await knex('properties').select('id', 'name');
  const [officeProperty, residentialProperty, industrialProperty] = properties;

  // SEED CHECKLIST TEMPLATES
  const existingTemplates = await knex('checklist_templates').select('id').limit(1);
  if (existingTemplates.length === 0) {
    const templateIds = await knex('checklist_templates').insert([
      {
        name: 'Monthly Safety Inspection',
        description: 'Comprehensive monthly safety and security inspection checklist',
        category: 'safety',
        is_active: true,
        created_by: adminUser.id,
        tenant_id: 'default'
      },
      {
        name: 'Quarterly Fire Safety Check',
        description: 'Fire safety equipment and emergency procedures verification',
        category: 'safety',
        is_active: true,
        created_by: adminUser.id,
        tenant_id: 'default'
      },
      {
        name: 'Residential Unit Inspection',
        description: 'Standard residential unit inspection for maintenance and safety',
        category: 'inspection',
        is_active: true,
        created_by: adminUser.id,
        tenant_id: 'default'
      }
    ]).returning('id');
    
    console.log('✅ Created demo checklist templates');
    
    // Create template-property type associations
    const commercialType = await knex('property_types').where('code', 'commercial').first();
    const residentialType = await knex('property_types').where('code', 'residential').first();
    
    const templates = await knex('checklist_templates').select('id', 'name');
    const safetyTemplate = templates.find(t => t.name === 'Monthly Safety Inspection');
    const fireTemplate = templates.find(t => t.name === 'Quarterly Fire Safety Check');
    const residentialTemplate = templates.find(t => t.name === 'Residential Unit Inspection');
    
    // Associate templates with property types
    const associations = [];
    if (safetyTemplate && commercialType) {
      associations.push({ template_id: safetyTemplate.id, property_type_id: commercialType.id });
    }
    if (residentialTemplate && residentialType) {
      associations.push({ template_id: residentialTemplate.id, property_type_id: residentialType.id });
    }
    // Fire safety applies to all property types - we'll add associations for all types
    if (fireTemplate) {
      const allPropertyTypes = await knex('property_types').select('id');
      allPropertyTypes.forEach(pt => {
        associations.push({ template_id: fireTemplate.id, property_type_id: pt.id });
      });
    }
    
    if (associations.length > 0) {
      await knex('template_property_types').insert(associations);
      console.log('✅ Created template-property type associations');
    }
  }

  // Get template IDs and create checklist items
  const templates = await knex('checklist_templates').select('id', 'name');
  const safetyTemplate = templates.find(t => t.name === 'Monthly Safety Inspection');
  const fireTemplate = templates.find(t => t.name === 'Quarterly Fire Safety Check');
  const residentialTemplate = templates.find(t => t.name === 'Residential Unit Inspection');

  // SEED CHECKLIST ITEMS
  const existingItems = await knex('checklist_items').select('id').limit(1);
  if (existingItems.length === 0 && safetyTemplate) {
    await knex('checklist_items').insert([
      // Safety inspection items
      {
        template_id: safetyTemplate.id,
        item_text: 'Check all emergency exits are clear and accessible',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: safetyTemplate.id,
        item_text: 'Verify security camera functionality',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: safetyTemplate.id,
        item_text: 'Upload photos of any safety concerns',
        item_type: 'file_upload',
        is_required: false,
        sort_order: 3,
        config_json: JSON.stringify({ accept: 'image/*', maxFiles: 5 })
      },
      {
        template_id: safetyTemplate.id,
        item_text: 'Inspector signature',
        item_type: 'signature',
        is_required: true,
        sort_order: 4
      },
      // Fire safety items
      {
        template_id: fireTemplate.id,
        item_text: 'Test fire alarm system',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: fireTemplate.id,
        item_text: 'Check fire extinguisher pressure and expiration',
        item_type: 'checkbox',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: fireTemplate.id,
        item_text: 'Additional notes or concerns',
        item_type: 'text',
        is_required: false,
        sort_order: 3
      }
    ]);
    
    console.log('✅ Created demo checklist items');
  }

  // SEED ALERT TYPES
  const existingAlertTypes = await knex('alert_types').select('id').limit(1);
  if (existingAlertTypes.length === 0) {
    await knex('alert_types').insert([
      {
        name: 'Unauthorized Access',
        description: 'Person detected in restricted area outside business hours',
        severity_level: 'high',
        auto_create_ticket: true,
        auto_create_checklist: true,
        is_active: true,
        tenant_id: 'default',
        config_json: JSON.stringify({ 
          businessHours: { start: '08:00', end: '18:00' },
          restrictedAreas: ['server_room', 'storage'] 
        })
      },
      {
        name: 'Motion Detection',
        description: 'General motion detected by camera',
        severity_level: 'low',
        auto_create_ticket: false,
        auto_create_checklist: false,
        is_active: true,
        tenant_id: 'default'
      },
      {
        name: 'Equipment Malfunction',
        description: 'Camera or security equipment appears to be malfunctioning',
        severity_level: 'medium',
        auto_create_ticket: true,
        auto_create_checklist: false,
        is_active: true,
        tenant_id: 'default'
      },
      {
        name: 'Fire/Smoke Detection',
        description: 'Potential fire or smoke detected in camera feed',
        severity_level: 'critical',
        auto_create_ticket: true,
        auto_create_checklist: true,
        is_active: true,
        tenant_id: 'default'
      }
    ]);
    
    console.log('✅ Created demo alert types');
  }

  // SEED CAMERA FEEDS
  const existingCameras = await knex('camera_feeds').select('id').limit(1);
  if (existingCameras.length === 0 && officeProperty) {
    await knex('camera_feeds').insert([
      {
        property_id: officeProperty.id,
        name: 'Main Entrance Camera',
        feed_url: 'rtsp://demo-camera-1.trusted360.local/stream',
        feed_type: 'rtsp',
        location: 'main_entrance',
        status: 'active',
        config_json: JSON.stringify({ 
          resolution: '1920x1080',
          fps: 30,
          nightVision: true 
        })
      },
      {
        property_id: officeProperty.id,
        name: 'Parking Lot Camera',
        feed_url: 'rtsp://demo-camera-2.trusted360.local/stream',
        feed_type: 'rtsp',
        location: 'parking_lot',
        status: 'active',
        config_json: JSON.stringify({ 
          resolution: '1920x1080',
          fps: 15,
          nightVision: true 
        })
      },
      {
        property_id: residentialProperty?.id || officeProperty.id,
        name: 'Lobby Security Camera',
        feed_url: 'rtsp://demo-camera-3.trusted360.local/stream',
        feed_type: 'rtsp',
        location: 'lobby',
        status: 'active'
      }
    ]);
    
    console.log('✅ Created demo camera feeds');
  }

  // SEED KNOWLEDGE BASE
  const existingKnowledge = await knex('knowledge_base').select('id').limit(1);
  if (existingKnowledge.length === 0) {
    await knex('knowledge_base').insert([
      {
        content_type: 'system_info',
        content_id: null,
        content_text: 'Trusted360 is a comprehensive security audit platform that manages property checklists, video analysis, and provides AI-powered assistance. The system supports multi-tenant architecture with role-based access control.',
        tags: ['system', 'overview', 'platform'],
        tenant_id: 'default'
      },
      {
        content_type: 'checklist_help',
        content_id: null,
        content_text: 'Property checklists can be created from templates and assigned to users. Each checklist supports various item types including text responses, checkboxes, file uploads, photos, and digital signatures. Completed checklists can require approval from managers.',
        tags: ['checklists', 'templates', 'workflow'],
        tenant_id: 'default'
      },
      {
        content_type: 'video_analysis_help',
        content_id: null,
        content_text: 'The video analysis system monitors camera feeds and generates alerts based on configured rules. Alerts can automatically create service tickets and trigger inspection checklists. Alert types include unauthorized access, motion detection, equipment malfunction, and fire/smoke detection.',
        tags: ['video', 'alerts', 'automation'],
        tenant_id: 'default'
      },
      {
        content_type: 'user_roles',
        content_id: null,
        content_text: 'The system supports different user roles: Admin users can manage all system settings, create templates, and approve checklists. Regular users can complete assigned checklists and view alerts for their properties. Super admins have full system access including user management.',
        tags: ['users', 'roles', 'permissions'],
        tenant_id: 'default'
      }
    ]);
    
    console.log('✅ Created demo knowledge base entries');
  }

  console.log('🎉 Feature demo data seeding completed successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Clean up in reverse order of dependencies
  await knex('knowledge_base').del();
  await knex('camera_feeds').del();
  await knex('alert_types').del();
  await knex('checklist_items').del();
  await knex('checklist_templates').del();
  await knex('properties').del();
  console.log('🗑️  Removed all feature demo data');
};
