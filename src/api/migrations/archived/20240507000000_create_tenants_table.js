/**
 * Migration to create tenants table
 * This must run before tables that reference the tenants table
 */
exports.up = async (knex) => {
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('name').notNullable();
    table.string('subdomain').unique();
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  
  // Add trigger for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('tenants');
}; 