exports.up = function(knex) {
  return knex.schema
    // Organizations (for multi-tenancy)
    .createTable('organizations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('slug').unique().notNullable();
      table.jsonb('settings').defaultTo('{}');
      table.timestamps(true, true);
    })
    
    // Facilities
    .createTable('facilities', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('address');
      table.point('location'); // PostGIS for geolocation
      table.jsonb('metadata').defaultTo('{}');
      table.integer('total_units').defaultTo(0);
      table.integer('occupied_units').defaultTo(0);
      table.timestamps(true, true);
      table.index(['organization_id']);
    })
    
    // Storage Units
    .createTable('units', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').references('facilities.id').onDelete('CASCADE');
      table.string('unit_number').notNullable();
      table.enum('size', ['5x5', '5x10', '10x10', '10x15', '10x20', '10x30', 'custom']);
      table.decimal('monthly_rate', 10, 2);
      table.enum('status', ['available', 'occupied', 'maintenance', 'reserved']);
      table.uuid('current_tenant_id').references('users.id').nullableDelete();
      table.jsonb('dimensions'); // {width, length, height}
      table.jsonb('features').defaultTo('[]'); // ['climate_controlled', 'ground_floor', etc]
      table.timestamps(true, true);
      table.unique(['facility_id', 'unit_number']);
      table.index(['facility_id', 'status']);
    })
    
    // Contracts/Leases
    .createTable('contracts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('unit_id').references('units.id').onDelete('CASCADE');
      table.uuid('tenant_id').references('users.id').onDelete('CASCADE');
      table.date('start_date').notNullable();
      table.date('end_date');
      table.decimal('monthly_rate', 10, 2);
      table.enum('status', ['active', 'expired', 'terminated']);
      table.jsonb('terms').defaultTo('{}');
      table.timestamps(true, true);
      table.index(['unit_id', 'status']);
      table.index(['tenant_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('contracts')
    .dropTableIfExists('units')
    .dropTableIfExists('facilities')
    .dropTableIfExists('organizations');
}; 