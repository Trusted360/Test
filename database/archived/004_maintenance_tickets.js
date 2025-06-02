exports.up = function(knex) {
  return knex.schema
    .createTable('maintenance_tickets', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').references('facilities.id').onDelete('CASCADE');
      table.uuid('unit_id').references('units.id').nullableDelete();
      table.uuid('reported_by').references('users.id').onDelete('SET NULL');
      table.uuid('assigned_to').references('users.id').nullableDelete();
      table.string('title').notNullable();
      table.text('description');
      table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
      table.enum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed']).defaultTo('open');
      table.enum('category', [
        'electrical',
        'plumbing',
        'structural',
        'security',
        'cleaning',
        'pest_control',
        'hvac',
        'other'
      ]);
      table.jsonb('attachments').defaultTo('[]'); // Array of image URLs
      table.timestamp('due_date');
      table.timestamp('resolved_at');
      table.timestamps(true, true);
      table.index(['facility_id', 'status']);
      table.index(['assigned_to', 'status']);
    })
    
    .createTable('maintenance_comments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('ticket_id').references('maintenance_tickets.id').onDelete('CASCADE');
      table.uuid('user_id').references('users.id').onDelete('SET NULL');
      table.text('comment').notNullable();
      table.jsonb('attachments').defaultTo('[]');
      table.timestamps(true, true);
      table.index(['ticket_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('maintenance_comments')
    .dropTableIfExists('maintenance_tickets');
}; 