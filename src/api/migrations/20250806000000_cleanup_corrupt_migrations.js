exports.up = function(knex) {
  // Manually delete the orphaned migration records from the knex_migrations table
  return knex('knex_migrations')
    .whereIn('name', [
      '20250731000000_create_sop_management_system.js',
      '20250802000001_create_sop_tables.js',
      '20250803000000_replace_sop_with_simple_tables.js',
      '20250805000000_nuclear_sop_cleanup.js'
    ])
    .delete();
};

exports.down = function(knex) {
  // This migration is not reversible, as it's a destructive cleanup operation.
  // If you need to revert, you would have to manually re-insert the deleted records.
  return Promise.resolve();
};