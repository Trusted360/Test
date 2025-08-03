const knex = require('knex');
const config = require('./src/config');

async function seedDemoData() {
  console.log('Seeding demo data for Properties and Checklists...\n');
  
  // Create knex instance
  const db = knex({
    client: 'pg',
    connection: config.database.url,
    pool: config.database.pool
  });

  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('Database connection successful\n');

    // Check if demo data already exists
    const existingProperties = await db('properties').count('* as count').first();
    if (existingProperties.count > '0') {
      console.log('Demo data already exists, skipping seed...');
      return;
    }

    // Insert demo properties
    console.log('Creating demo properties...');
    const propertyIds = await db('properties').insert([
      {
        name: 'Downtown Office Complex',
        address: '123 Main Street, Downtown, City, State 12345',
        property_type: 'commercial',
        status: 'active'
      },
      {
        name: 'Westside Apartments',
        address: '456 Oak Avenue, Westside, City, State 12346',
        property_type: 'residential', 
        status: 'active'
      },
      {
        name: 'Industrial Storage Facility',
        address: '789 Industrial Way, Industrial District, City, State 12347',
        property_type: 'warehouse',
        status: 'active'
      }
    ]).returning('id');

    console.log(`Created ${propertyIds.length} demo properties`);

    // Insert demo checklist templates
    console.log('Creating demo checklist templates...');
    const templateIds = await db('checklist_templates').insert([
      {
        name: 'Daily Security Check',
        description: 'Standard daily security inspection checklist',
        category: 'security',
        is_active: true
      },
      {
        name: 'Weekly Safety Inspection',
        description: 'Comprehensive weekly safety review',
        category: 'safety',
        is_active: true
      },
      {
        name: 'Monthly Maintenance Review',
        description: 'Monthly preventive maintenance checklist',
        category: 'maintenance',
        is_active: true
      },
      {
        name: 'Video Event Investigation',
        description: 'Checklist for investigating video security events',
        category: 'video_event',
        is_active: true
      }
    ]).returning('id');

    console.log(`Created ${templateIds.length} demo checklist templates`);

    // Insert demo checklist items for each template
    console.log('Creating demo checklist items...');
    
    // Items for Daily Security Check
    await db('checklist_items').insert([
      {
        template_id: templateIds[0].id,
        item_text: 'Check all entry points are secure',
        item_type: 'boolean',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: templateIds[0].id,
        item_text: 'Verify security cameras are operational',
        item_type: 'boolean',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: templateIds[0].id,
        item_text: 'Notes on any security concerns',
        item_type: 'text',
        is_required: false,
        sort_order: 3
      }
    ]);

    // Items for Weekly Safety Inspection
    await db('checklist_items').insert([
      {
        template_id: templateIds[1].id,
        item_text: 'Emergency exits clear and accessible',
        item_type: 'boolean',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: templateIds[1].id,
        item_text: 'Fire extinguisher inspection',
        item_type: 'boolean',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: templateIds[1].id,
        item_text: 'Upload safety incident photos if any',
        item_type: 'photo',
        is_required: false,
        sort_order: 3
      }
    ]);

    // Items for Monthly Maintenance Review
    await db('checklist_items').insert([
      {
        template_id: templateIds[2].id,
        item_text: 'HVAC system inspection',
        item_type: 'boolean',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: templateIds[2].id,
        item_text: 'Maintenance cost estimate',
        item_type: 'number',
        is_required: false,
        sort_order: 2
      },
      {
        template_id: templateIds[2].id,
        item_text: 'Maintenance supervisor signature',
        item_type: 'signature',
        is_required: true,
        requires_approval: true,
        sort_order: 3
      }
    ]);

    // Items for Video Event Investigation
    await db('checklist_items').insert([
      {
        template_id: templateIds[3].id,
        item_text: 'Event timestamp verification',
        item_type: 'text',
        is_required: true,
        sort_order: 1
      },
      {
        template_id: templateIds[3].id,
        item_text: 'Incident severity level (1-5)',
        item_type: 'number',
        is_required: true,
        sort_order: 2
      },
      {
        template_id: templateIds[3].id,
        item_text: 'Upload incident video clip',
        item_type: 'file',
        is_required: false,
        sort_order: 3
      },
      {
        template_id: templateIds[3].id,
        item_text: 'Investigation notes',
        item_type: 'text',
        is_required: true,
        sort_order: 4
      }
    ]);

    console.log('Demo checklist items created successfully');

    console.log('\nDemo data seeding completed successfully!');
    console.log('\nCreated:');
    console.log(`- ${propertyIds.length} demo properties`);
    console.log(`- ${templateIds.length} checklist templates`);
    console.log('- Multiple checklist items for each template');
    
  } catch (error) {
    console.error('Error seeding demo data:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the seeding
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDemoData;