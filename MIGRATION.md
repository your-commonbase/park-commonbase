# SQLite to Supabase Migration Guide

This guide walks you through migrating your Park Commonbase data from SQLite to Supabase PostgreSQL.

## Prerequisites

1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Database Connection**: Get your connection string from Supabase Dashboard → Settings → Database

## Migration Steps

### 1. Setup Environment Variables

Update your `.env.local` file with your Supabase connection string:

```bash
# Replace with your actual Supabase details

# Direct connection (requires IPv6 support - recommended):
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# OR use connection pooling (more compatible):
# DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Custom table name for different environments (optional)
DATABASE_TABLE_NAME=entries
# For production: DATABASE_TABLE_NAME=entries_prod
# For staging: DATABASE_TABLE_NAME=entries_staging
```

You can find this connection string in your Supabase project:
- Go to Settings → Database
- Copy the connection string under "Connection String"
- Replace `[YOUR-PASSWORD]` with your database password

### 2. Test Your Connection

Before proceeding, test your Supabase connection:

```bash
npm run test-supabase
```

This will verify your connection string and test pgvector availability.

### 3. Generate Prisma Schema and Client

Generate the Prisma schema with your custom table name, then create the client:

```bash
npm run generate-schema  # Generates schema with your custom table name
npx prisma generate      # Creates the Prisma client
```

This will create a schema that maps your Entry model to the table name specified in `DATABASE_TABLE_NAME`.

### 4. Enable pgvector Extension

Before running the migration, ensure pgvector is enabled in your Supabase project:

**Option A: Via Supabase Dashboard**
- Go to Database → Extensions
- Search for "vector" and enable the pgvector extension

**Option B: Via SQL Editor**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Create Database Schema

The migration script will automatically create the schema with pgvector support, including:
- `entries` table with `vector(1536)` type for embeddings
- Vector similarity indexes for fast embedding search
- All existing relationships and constraints

### 6. Run Migration Script

Execute the migration script to transfer all your existing data:

```bash
npm run migrate-to-supabase
```

The script will:
- ✅ Read all entries from your SQLite database
- ✅ Connect to your Supabase PostgreSQL database
- ✅ Create the database schema if needed
- ✅ Migrate all entries preserving relationships and metadata
- ✅ Handle embeddings, comments, and all existing data
- ✅ Provide detailed progress updates and error handling

### 7. Verify Migration

After migration, the script will show:
- Total entries migrated
- Sample migrated data
- Any errors encountered

You can also verify in Supabase Dashboard → Table Editor → entries

## What Gets Migrated

The migration preserves all your existing data:

- ✅ **Entry Content**: All text, transcriptions, and data
- ✅ **Metadata**: Authors, types, file URLs, and custom metadata
- ✅ **Embeddings**: Vector embeddings stored as pgvector for fast semantic search
- ✅ **Collections**: All your collections and their organization
- ✅ **Comments**: Parent-child relationships between entries
- ✅ **Timestamps**: Creation and update times
- ✅ **File References**: Image URLs, audio URLs, etc.

## Environment-Specific Deployments

With the new configurable table names, you can easily manage multiple environments:

### Development
```bash
# .env.local
DATABASE_URL="postgresql://postgres:dev_password@db.project.supabase.co:5432/postgres"
DATABASE_TABLE_NAME=entries
```

### Staging
```bash
# .env.staging
DATABASE_URL="postgresql://postgres:staging_password@db.project.supabase.co:5432/postgres"
DATABASE_TABLE_NAME=entries_staging
```

### Production
```bash
# .env.production
DATABASE_URL="postgresql://postgres:prod_password@db.project.supabase.co:5432/postgres"
DATABASE_TABLE_NAME=entries_prod
```

Each environment can use the same database with different table names, or different databases entirely.

## Direct vs Pooled Connections

### Direct Connection (Recommended)
- **Advantages**: Lower latency, full PostgreSQL feature support
- **Requirements**: IPv6 support, fewer concurrent connections
- **Format**: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`

### Connection Pooling
- **Advantages**: Better for high concurrency, IPv4 compatible
- **Limitations**: Some PostgreSQL features may be limited
- **Format**: `postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:5432/postgres`

## After Migration

Once migration is complete:

1. **Test the Application**: Start your development server and verify everything works
2. **Backup Old Data**: Keep your SQLite `dev.db` file as backup
3. **Update Production**: Deploy with the new PostgreSQL configuration

## Troubleshooting

### Connection Issues
- Verify your DATABASE_URL is correct
- Check Supabase project is active and accessible
- Ensure your IP is allowed (or disable IP restrictions temporarily)

### Migration Errors
- The script continues on individual entry errors
- Check the console output for specific error messages
- Verify your SQLite database path is correct

### Schema Issues
- If you get schema errors, try running `npx prisma db push` again
- Check your Supabase database permissions

## Rollback (if needed)

If you need to rollback:

1. Update your `.env.local` to point back to SQLite:
   ```
   DATABASE_URL="file:./dev.db"
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

3. Regenerate the Prisma client:
   ```bash
   npx prisma generate
   ```

## Support

If you encounter issues during migration:
1. Check the detailed console output from the migration script
2. Verify your Supabase connection and permissions
3. Ensure all dependencies are properly installed

The migration script includes extensive error handling and will provide detailed information about any issues encountered.