#!/usr/bin/env node

/*jslint node: true */
'use strict';

const { execSync } = require('child_process');

/**
 * Pre-commit hook to prevent direct schema modifications in sql.js
 * This enforces the migration-only workflow for database changes
 */

function checkSchemaChanges() {
    try {
        // Get the staged changes to sql.js
        const stagedDiff = execSync('git diff --cached --name-only', { encoding: 'utf8' });

        // Check if sql.js is being modified
        if (stagedDiff.includes('src/server/sql.js')) {
            console.log('\n🔍 Checking sql.js modifications...\n');

            // Get the actual diff content
            const diffContent = execSync('git diff --cached src/server/sql.js', { encoding: 'utf8' });

            // Check for dangerous schema modifications
            const dangerousPatterns = [
                /CREATE TABLE(?!.*IF NOT EXISTS)/i,
                /ALTER TABLE/i,
                /DROP TABLE/i,
                /DROP COLUMN/i,
                /ADD COLUMN/i,
                /CREATE INDEX(?!.*IF NOT EXISTS)/i,
                /DROP INDEX/i,
                /ADD CONSTRAINT/i,
                /DROP CONSTRAINT/i
            ];

            const foundProblems = [];
            const lines = diffContent.split('\n');

            lines.forEach((line, index) => {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    const content = line.substring(1).trim();
                    dangerousPatterns.forEach((pattern, patternIndex) => {
                        if (pattern.test(content)) {
                            foundProblems.push({
                                line: index + 1,
                                content: content,
                                pattern: patternIndex
                            });
                        }
                    });
                }
            });

            if (foundProblems.length > 0) {
                console.log('❌ SCHEMA MODIFICATION DETECTED IN sql.js!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('');
                console.log('🚨 You are trying to modify database schema directly in sql.js');
                console.log('   This will cause deployment and synchronization issues!');
                console.log('');
                console.log('📋 Found these schema modifications:');

                foundProblems.forEach(problem => {
                    console.log(`   Line ${problem.line}: ${problem.content}`);
                });

                console.log('');
                console.log('✅ CORRECT WORKFLOW:');
                console.log('   1. Create a migration:');
                console.log('      npm run migration:create your_change_description');
                console.log('');
                console.log('   2. Edit the generated migration file with your changes');
                console.log('');
                console.log('   3. Test the migration:');
                console.log('      npm start');
                console.log('');
                console.log('   4. Commit BOTH your code changes AND the migration file');
                console.log('');
                console.log('💡 This ensures your changes work in ALL environments!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                process.exit(1);
            } else {
                // Only allow safe changes (comments, logging, etc.)
                console.log('✅ sql.js changes appear safe (no schema modifications detected)');
            }
        }

        console.log('✅ Schema modification check passed');

    } catch (error) {
        // If git commands fail, we're probably not in a git repo or no staged changes
        // Don't block the commit in this case
        console.log('⚠️  Could not check for schema modifications (not in git repo?)');
    }
}

checkSchemaChanges();