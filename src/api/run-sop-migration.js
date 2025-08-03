const config = require('./src/config');
const { Client } = require('pg');

async function runSOPMigration() {
  // Extract connection details from database URL
  const dbUrl = config.database.url;
  console.log('Database URL:', dbUrl.replace(/:[^@]*@/, ':****@')); // Hide password in logs
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if SOP tables already exist
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sop_templates', 'sop_items', 'property_sops')
    `);

    if (checkTables.rows.length > 0) {
      console.log('SOP tables already exist:', checkTables.rows.map(r => r.table_name));
      return;
    }

    console.log('Creating SOP tables...');

    // Create sop_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sop_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sop_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sop_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES sop_templates(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create property_sops table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_sops (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES sop_templates(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, template_id)
      )
    `);

    console.log('SOP tables created successfully');

    // Insert demo SOP template
    const template = await client.query(`
      INSERT INTO sop_templates (name, description) 
      VALUES ('Security Check', 'Standard security inspection procedure') 
      RETURNING id
    `);
    
    const templateId = template.rows[0].id;

    // Insert demo SOP items
    await client.query(`
      INSERT INTO sop_items (template_id, title, description, sort_order) VALUES
      ($1, 'Check all entry points', 'Verify all doors and windows are secure', 1),
      ($1, 'Test alarm system', 'Ensure alarm system is functioning properly', 2),
      ($1, 'Review security cameras', 'Check all camera feeds and recording', 3)
    `, [templateId]);

    console.log('Demo SOP data inserted successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runSOPMigration()
  .then(() => {
    console.log('SOP migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('SOP migration failed:', error);
    process.exit(1);
  });