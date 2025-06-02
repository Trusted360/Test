exports.up = function(knex) {
  return knex.schema
    // Camera configurations
    .createTable('cameras', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').references('facilities.id').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('stream_url');
      table.enum('type', ['entrance', 'hallway', 'unit', 'perimeter', 'office']);
      table.jsonb('coverage_zones').defaultTo('[]'); // Array of unit IDs or areas
      table.boolean('is_active').defaultTo(true);
      table.jsonb('ai_config').defaultTo('{}'); // Detection settings
      table.timestamps(true, true);
      table.index(['facility_id', 'is_active']);
    })
    
    // Video analysis events
    .createTable('video_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('camera_id').references('cameras.id').onDelete('CASCADE');
      table.uuid('unit_id').references('units.id').nullableDelete();
      table.enum('event_type', [
        'motion_detected',
        'unauthorized_access',
        'unit_opened',
        'unit_closed',
        'suspicious_activity',
        'maintenance_needed',
        'overcrowding'
      ]);
      table.jsonb('metadata').defaultTo('{}'); // AI detection details
      table.string('video_clip_url');
      table.timestamp('occurred_at').notNullable();
      table.boolean('reviewed').defaultTo(false);
      table.uuid('reviewed_by').references('users.id').nullableDelete();
      table.timestamps(true, true);
      table.index(['camera_id', 'occurred_at']);
      table.index(['unit_id', 'event_type']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('video_events')
    .dropTableIfExists('cameras');
}; 