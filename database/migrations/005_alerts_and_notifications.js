exports.up = function(knex) {
  return knex.schema
    .createTable('alert_rules', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').references('facilities.id').onDelete('CASCADE');
      table.string('name').notNullable();
      table.enum('type', [
        'unit_access',
        'after_hours_activity',
        'maintenance_due',
        'payment_overdue',
        'suspicious_behavior',
        'environmental'
      ]);
      table.jsonb('conditions').notNullable(); // Rule conditions
      table.jsonb('actions').notNullable(); // What to do when triggered
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.index(['facility_id', 'is_active']);
    })
    
    .createTable('notifications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('users.id').onDelete('CASCADE');
      table.uuid('facility_id').references('facilities.id').nullableDelete();
      table.uuid('unit_id').references('units.id').nullableDelete();
      table.string('title').notNullable();
      table.text('message');
      table.enum('type', ['info', 'warning', 'alert', 'critical']);
      table.enum('channel', ['in_app', 'email', 'sms', 'push']);
      table.boolean('is_read').defaultTo(false);
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('sent_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      table.index(['user_id', 'is_read']);
      table.index(['facility_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('notifications')
    .dropTableIfExists('alert_rules');
}; 