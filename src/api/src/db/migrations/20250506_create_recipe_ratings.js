/**
 * Migration: Create recipe_ratings table
 */
exports.up = async (knex) => {
  await knex.schema.createTable('recipe_ratings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
    table.uuid('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.integer('rating').notNullable().checkIn([1, 2, 3, 4, 5]);
    table.text('feedback');
    table.uuid('tenant_id').notNullable();
    table.timestamps(true, true);
    
    // Add unique constraint to prevent duplicate ratings from the same member for the same recipe
    table.unique(['member_id', 'recipe_id', 'tenant_id']);
    
    // Add tenant isolation
    table.index(['tenant_id']);
  });
  
  // Add row-level security policy
  await knex.raw(`
    ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY recipe_ratings_tenant_isolation_policy
      ON recipe_ratings
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  `);
  
  // Create index for faster average rating calculation
  await knex.raw(`
    CREATE INDEX recipe_ratings_recipe_id_rating_idx
      ON recipe_ratings (recipe_id, rating);
  `);
};

/**
 * Migration: Drop recipe_ratings table
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('recipe_ratings');
};
