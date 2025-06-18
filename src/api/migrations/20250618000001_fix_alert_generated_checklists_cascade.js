/**
 * Fix foreign key constraint for alert_generated_checklists
 * Add ON DELETE CASCADE to allow proper deletion of video-generated checklists
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Drop the existing foreign key constraint
    .then(() => {
      return knex.schema.alterTable('alert_generated_checklists', (table) => {
        table.dropForeign(['checklist_id']);
      });
    })
    // Add the foreign key constraint with ON DELETE CASCADE
    .then(() => {
      return knex.schema.alterTable('alert_generated_checklists', (table) => {
        table.foreign('checklist_id')
          .references('id')
          .inTable('property_checklists')
          .onDelete('CASCADE');
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.resolve()
    // Drop the CASCADE foreign key constraint
    .then(() => {
      return knex.schema.alterTable('alert_generated_checklists', (table) => {
        table.dropForeign(['checklist_id']);
      });
    })
    // Add back the original foreign key constraint without CASCADE
    .then(() => {
      return knex.schema.alterTable('alert_generated_checklists', (table) => {
        table.foreign('checklist_id')
          .references('id')
          .inTable('property_checklists');
      });
    });
};
