const Migration = require('../models/migration');
const updatePromptSchema = require('./scripts/001-update-prompt-schema');
const removePromptTags = require('./scripts/002-remove-prompt-tags');

const migrations = [updatePromptSchema, removePromptTags];

async function runMigrations() {
  console.log('Checking for pending migrations...');

  const appliedMigrations = await Migration.find({}).select('name');
  const appliedMigrationNames = appliedMigrations.map((m) => m.name);

  const pendingMigrations = migrations.filter(
    ({ name }) => !appliedMigrationNames.includes(name)
  );

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migrations.`);

  for (const mig of pendingMigrations) {
    try {
      console.log(`Running migration: ${mig.name}`);

      await mig.up();

      await Migration.create({ name: mig.name });

      console.log(`Migration ${mig.name} completed successfully.`);
    } catch (error) {
      console.error(`Migration ${mig.name} failed:`, error);
      process.exit(1); // Exit if migration fails
    }
  }

  console.log('All migrations completed successfully.');
}

module.exports = { runMigrations };
