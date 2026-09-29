const { runMigrations } = require('./migrate');

console.log('Non-destructive setup: running migrations only.');
console.log('This script does NOT drop schemas, tables, or data.');

runMigrations().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});
