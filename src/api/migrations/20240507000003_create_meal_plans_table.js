/**
 * Migration to create meal_plans table
 * This must run before the meal_plan_constraints table migration
 */
exports.up = async (knex) => {
  await knex.schema.createTable('meal_plans', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('name').notNullable();
    table.uuid('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.string('status').defaultTo('draft');
    table.date('start_date');
    table.date('end_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('tenant_id').references('id').inTable('tenants');
    
    // Add indexes
    table.index('household_id');
    table.index(['tenant_id', 'status']);
  });

  // Add row-level security for tenant isolation
  await knex.raw(`
    ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_policy ON meal_plans
      USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);
  `);
  
  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_meal_plans_updated_at 
    BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('meal_plans');
}; 