exports.up = function(knex) {
  return knex.schema
    // Users table (adapted from Simmer)
    .createTable('users', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name');
      table.string('last_name');
      table.string('phone');
      table.enum('role', ['super_admin', 'facility_manager', 'staff', 'tenant']).defaultTo('tenant');
      table.boolean('is_active').defaultTo(true);
      table.jsonb('preferences').defaultTo('{}');
      table.timestamps(true, true);
      table.index(['email']);
    })
    
    // Sessions table
    .createTable('sessions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('users.id').onDelete('CASCADE');
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
      table.index(['token']);
      table.index(['user_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sessions')
    .dropTableIfExists('users');
}; 