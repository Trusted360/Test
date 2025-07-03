exports.up = function(knex) {
  return knex.schema
    // Create roles table
    .createTable('roles', function(table) {
      table.increments('id').primary();
      table.string('name', 50).notNullable().unique();
      table.string('description', 255);
      table.timestamps(true, true);
    })
    // Create user_roles junction table
    .createTable('user_roles', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('role_id').unsigned().notNullable()
        .references('id').inTable('roles').onDelete('CASCADE');
      table.timestamps(true, true);
      
      // Ensure a user can't have the same role twice
      table.unique(['user_id', 'role_id']);
    })
    // Add admin_level column to users if it doesn't exist
    .then(() => {
      return knex.schema.hasColumn('users', 'admin_level').then(exists => {
        if (!exists) {
          return knex.schema.alterTable('users', function(table) {
            table.string('admin_level', 50).defaultTo('none');
          });
        }
      });
    })
    // Insert default roles
    .then(() => {
      return knex('roles').insert([
        { name: 'admin', description: 'Full system administrator access' },
        { name: 'manager', description: 'Property manager with limited admin access' },
        { name: 'staff', description: 'Staff member with operational access' },
        { name: 'viewer', description: 'Read-only access to reports and data' }
      ]);
    })
    // Assign admin role to users with admin_level != 'none'
    .then(() => {
      return knex('users')
        .where('admin_level', '!=', 'none')
        .select('id')
        .then(adminUsers => {
          if (adminUsers.length > 0) {
            return knex('roles')
              .where('name', 'admin')
              .first()
              .then(adminRole => {
                const userRoles = adminUsers.map(user => ({
                  user_id: user.id,
                  role_id: adminRole.id
                }));
                return knex('user_roles').insert(userRoles);
              });
          }
        });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_roles')
    .dropTableIfExists('roles')
    .then(() => {
      return knex.schema.hasColumn('users', 'admin_level').then(exists => {
        if (exists) {
          return knex.schema.alterTable('users', function(table) {
            table.dropColumn('admin_level');
          });
        }
      });
    });
};