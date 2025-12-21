#!/usr/bin/env node
/**
 * Sync SQL files to TypeScript modules
 * Usage: node sync-sql.js
 *
 * This script reads .sql files in the migrations directory and generates
 * corresponding .ts files that export the SQL as a string.
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = __dirname;

// Find all .sql files
const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

console.log(`Found ${sqlFiles.length} SQL migration files`);

sqlFiles.forEach(sqlFile => {
    const sqlPath = path.join(migrationsDir, sqlFile);
    const tsFile = sqlFile.replace('.sql', '.ts');
    const tsPath = path.join(migrationsDir, tsFile);

    // Read SQL content
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Generate TypeScript content
    const tsContent = `// Auto-generated from ${sqlFile}
// To update: edit the .sql file and run: node sync-sql.js

const schema = \`${sqlContent}\`;

export default schema;
`;

    // Write TypeScript file
    fs.writeFileSync(tsPath, tsContent, 'utf8');
    console.log(`✅ Generated ${tsFile} from ${sqlFile}`);
});

console.log('\n✨ All SQL files synced successfully!');
