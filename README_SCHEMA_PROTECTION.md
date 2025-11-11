# 🔒 Database Schema Protection System

This project has **multiple layers of protection** to prevent direct database schema modifications and enforce the migration-only workflow.

## 🎯 Why This Protection Exists

**Problem**: Direct schema changes in `sql.js` cause:
- ❌ Deployment failures (code expects columns that don't exist)
- ❌ Environment inconsistency (dev vs production schema drift)
- ❌ Data loss (uncoordinated schema changes)
- ❌ Team conflicts (multiple people modifying schema)

**Solution**: Force ALL schema changes through the migration system ✅

## 🛡️ Protection Layers

### Layer 1: Visual Warnings
**File**: `src/server/sql.js`
- Large warning comments at the top of the schema initialization function
- Console warning on every server startup
- Clear instructions on correct workflow

### Layer 2: Git Pre-Commit Hook
**Files**: `.githooks/pre-commit`, `scripts/check-schema-changes.js`

**What it does**:
- Scans staged changes to `sql.js` for dangerous schema modifications
- Blocks commits containing `ALTER TABLE`, `CREATE TABLE` (without IF NOT EXISTS), etc.
- Shows helpful error message with correct workflow

**Setup**:
```bash
npm run setup-hooks  # One-time setup
```

**Example blocked commit**:
```bash
❌ SCHEMA MODIFICATION DETECTED IN sql.js!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 You are trying to modify database schema directly in sql.js

✅ CORRECT WORKFLOW:
1. Create a migration: npm run migration:create your_change
2. Edit the generated migration file
3. Test the migration: npm start
4. Commit BOTH your code changes AND the migration file
```

### Layer 3: Runtime Schema Lock (Production)
**File**: `src/server/db/schema-lock.js`

**What it does**:
- Monitors database queries in real-time
- Blocks dangerous schema operations outside migration context
- Enabled automatically in production (`NODE_ENV=production`)
- Can be enabled in development with `ENFORCE_SCHEMA_LOCK=true`

**Example runtime protection**:
```javascript
// This would be blocked in production:
await client.query('ALTER TABLE users ADD COLUMN new_field TEXT');

// Error thrown:
// 🚨 SCHEMA LOCK VIOLATION 🚨
// Query blocked: Direct schema modification detected outside migration system.
```

### Layer 4: Migration Context Bypass
**Integration**: `src/server/db/migrations/runner.js`

**What it does**:
- Migrations are allowed to modify schema (they bypass the schema lock)
- Uses special migration-context wrapper
- Ensures migrations can run while blocking direct modifications

## 🔧 How to Use

### ✅ Correct Workflow
```bash
# 1. Need to add a column?
npm run migration:create add_user_email_verified

# 2. Edit the generated migration file:
# src/server/db/migrations/20241110_001_add_user_email_verified.js
async up(client) {
    await client.query(`
        ALTER TABLE users
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
    `);
}

# 3. Test it
npm start  # Migration runs automatically

# 4. Commit everything
git add .
git commit -m "Add email verification feature"
```

### ❌ What Gets Blocked

**Pre-commit hook blocks**:
- Direct edits to schema tables in `sql.js`
- Adding `ALTER TABLE` statements to `sql.js`
- Any DDL statements that modify existing schema

**Runtime lock blocks** (production only):
- `ALTER TABLE` outside migrations
- `CREATE/DROP TABLE` outside initial setup
- `CREATE/DROP INDEX` outside initial setup
- `ADD/DROP CONSTRAINT` outside migrations

## 🎮 Testing the Protection

### Test Pre-Commit Hook
```bash
# Try to add a schema change to sql.js
echo "await client.query('ALTER TABLE users ADD COLUMN test TEXT');" >> src/server/sql.js

# Try to commit
git add src/server/sql.js
git commit -m "test"

# Should be blocked with helpful message
```

### Test Runtime Lock
```bash
# Enable schema lock in development
export ENFORCE_SCHEMA_LOCK=true
npm start

# Try to run a direct schema change in your code
# It will throw SchemaLockViolation error
```

### Test Migration Bypass
```bash
# Create a test migration
npm run migration:create test_schema_lock

# Edit it to add a column
# Restart server - should work fine (migrations are allowed)
npm start
```

## 🔧 Configuration

### Enable/Disable Schema Lock
```bash
# Production: Always enabled
NODE_ENV=production

# Development: Enable manually
ENFORCE_SCHEMA_LOCK=true

# Development: Disabled by default (allows flexibility)
# (no environment variable)
```

### Disable Pre-Commit Hook (Not Recommended)
```bash
# Skip hook for one commit (emergency only)
git commit --no-verify -m "emergency fix"

# Disable hooks entirely (NOT recommended)
git config core.hooksPath ""
```

## 🚨 Emergency Override

**If you REALLY need to bypass protection** (rare emergency situations):

1. **Disable schema lock**: `unset ENFORCE_SCHEMA_LOCK`
2. **Skip git hook**: `git commit --no-verify`
3. **Make your emergency change**
4. **Immediately create proper migration** to record the change
5. **Re-enable protection**: `npm run setup-hooks`

## 📊 Benefits

**Development Experience**:
- ✅ Prevents common deployment mistakes
- ✅ Forces good database hygiene
- ✅ Clear error messages with solutions
- ✅ Automatic workflow enforcement

**Production Safety**:
- ✅ Runtime protection against accidental schema changes
- ✅ Consistent schema across all environments
- ✅ Audit trail of all database changes
- ✅ Rollback capability through migrations

**Team Collaboration**:
- ✅ No more "works on my machine" schema issues
- ✅ All schema changes are code-reviewed
- ✅ Migration history visible in git
- ✅ Conflicts resolved through code review

## 🛠️ Troubleshooting

### "Schema Lock Violation" in Development
```bash
# Disable for development work
unset ENFORCE_SCHEMA_LOCK
npm start
```

### Pre-commit Hook Not Working
```bash
# Re-setup hooks
npm run setup-hooks

# Verify hook is executable
ls -la .githooks/pre-commit

# Test hook directly
node scripts/check-schema-changes.js
```

### Need to Modify Initial Schema
If you need to modify the base schema in `sql.js` (rare):

1. Add your changes to `sql.js` with `IF NOT EXISTS`
2. Create a migration for existing installations
3. The pre-commit hook allows `IF NOT EXISTS` operations

This multi-layered protection ensures that your database schema remains consistent and manageable as your application grows! 🎉