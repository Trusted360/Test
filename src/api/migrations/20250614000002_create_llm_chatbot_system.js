/**
 * LLM Chatbot System - Chat conversations and knowledge base
 * Integrates with existing user system and platform data
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.resolve()
    // Chat conversations - user chat sessions
    .then(() => {
      return knex.schema.hasTable('chat_conversations').then(exists => {
        if (!exists) {
          return knex.schema.createTable('chat_conversations', (table) => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users');
            table.integer('property_id').references('id').inTable('properties'); // Optional context
            table.string('title', 255);
            table.string('status', 50).defaultTo('active'); // active, archived
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['user_id']);
            table.index(['property_id']);
            table.index(['tenant_id']);
            table.index(['status']);
            table.index(['user_id', 'status']);
          });
        }
      });
    })
    
    // Chat messages - individual messages in conversations
    .then(() => {
      return knex.schema.hasTable('chat_messages').then(exists => {
        if (!exists) {
          return knex.schema.createTable('chat_messages', (table) => {
            table.increments('id').primary();
            table.integer('conversation_id').notNullable().references('id').inTable('chat_conversations').onDelete('CASCADE');
            table.string('sender_type', 50).notNullable(); // user, assistant
            table.integer('sender_id').references('id').inTable('users'); // null for assistant
            table.text('message_text').notNullable();
            table.string('message_type', 50).defaultTo('text'); // text, system, error
            table.jsonb('metadata_json'); // Additional message metadata
            table.timestamps(true, true);
            
            // Indexes
            table.index(['conversation_id']);
            table.index(['sender_type']);
            table.index(['sender_id']);
            table.index(['created_at']);
            table.index(['conversation_id', 'created_at']);
          });
        }
      });
    })
    
    // Knowledge base - contextual information for LLM
    .then(() => {
      return knex.schema.hasTable('knowledge_base').then(exists => {
        if (!exists) {
          return knex.schema.createTable('knowledge_base', (table) => {
            table.increments('id').primary();
            table.string('content_type', 100).notNullable(); // checklist_template, property, alert_type, etc.
            table.integer('content_id'); // Reference to the actual content
            table.text('content_text').notNullable(); // Searchable text representation
            table.specificType('tags', 'text[]'); // Array of tags for categorization
            table.string('tenant_id', 50).notNullable().defaultTo('default');
            table.timestamps(true, true);
            
            // Indexes
            table.index(['content_type']);
            table.index(['content_id']);
            table.index(['tenant_id']);
            table.index(['content_type', 'content_id']);
            table.index(['tenant_id', 'content_type']);
          });
        }
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('knowledge_base')
    .dropTableIfExists('chat_messages')
    .dropTableIfExists('chat_conversations');
};
