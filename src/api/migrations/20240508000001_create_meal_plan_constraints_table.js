/**
 * Migration to create meal_plan_constraints table
 */
exports.up = async (knex) => {
  await knex.schema.createTable('meal_plan_constraints', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('meal_plan_id').notNullable().references('id').inTable('meal_plans').onDelete('CASCADE');
    table.jsonb('preferences').defaultTo('[]');
    table.jsonb('dietary_restrictions').defaultTo('[]');
    table.jsonb('available_ingredients').defaultTo('[]');
    table.jsonb('excluded_ingredients').defaultTo('[]');
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('meal_plan_id');
    table.index('tenant_id');
    
    // Unique constraint to ensure one constraints entry per meal plan
    table.unique(['meal_plan_id', 'tenant_id']);
  });
  
  // Add row-level security for tenant isolation
  await knex.raw(`
    ALTER TABLE meal_plan_constraints ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_policy ON meal_plan_constraints
      USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);
  `);
  
  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_meal_plan_constraints_updated_at 
    BEFORE UPDATE ON meal_plan_constraints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('meal_plan_constraints');
}; 