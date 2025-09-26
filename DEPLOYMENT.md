# Deployment Guide: Park Commonbase

Deploy the Park Commonbase application to Vercel with Supabase in just a few clicks!

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fpark-commonbase&env=DATABASE_URL,OPENAI_API_KEY,API_KEY,NEXT_PUBLIC_API_KEY,ADMIN_USERNAME,ADMIN_PASSWORD&envDescription=Configure%20your%20database%20and%20API%20keys&envLink=https%3A%2F%2Fgithub.com%2Fyour-username%2Fpark-commonbase%2Fblob%2Fmain%2FDEPLOYMENT.md&demo-title=Park%20Commonbase&demo-description=AI-powered%20knowledge%20management%20for%20communities&demo-url=https%3A%2F%2Fpark-commonbase.vercel.app)

## Prerequisites

- A GitHub account
- A Vercel account
- A Supabase account
- An OpenAI API key
- An UploadThing account (optional, for file uploads)

## Step 1: Database Setup (Supabase)

### Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Choose a project name and set a strong database password
3. Wait for the project to be created (takes ~2-3 minutes)

### Enable pgvector Extension

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the following SQL to enable the pgvector extension:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Create the Database Schema

1. In the SQL Editor, run the following to create the entries table:

```sql
-- Create the entries table
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI ada-002 embedding dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collection TEXT DEFAULT 'default',
    parent_id UUID REFERENCES entries(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_entries_collection ON entries(collection);
CREATE INDEX idx_entries_parent_id ON entries(parent_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Get Database Connection String

1. Go to **Settings** → **Database**
2. Under **Connection Info**, copy the **Connection string**
3. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## Step 2: One-Click Deploy to Vercel

### Option A: Quick Deploy (Recommended)

1. Click the "Deploy with Vercel" button above
2. Sign in to Vercel and connect your GitHub account
3. Vercel will fork the repository and prompt for environment variables
4. Fill in the required environment variables (see below)
5. Click "Deploy" and wait for deployment to complete

### Option B: Manual Deploy

1. Fork this repository to your GitHub account
2. Go to [Vercel](https://vercel.com) and sign in
3. Click **New Project** and import your forked repository
4. Configure environment variables (see below)

### Environment Variables Configuration

When deploying, you'll be prompted to set these environment variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres
DATABASE_TABLE_NAME=entries

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# API Authentication
API_KEY=your-secure-random-api-key-here
NEXT_PUBLIC_API_KEY=your-secure-random-api-key-here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password-here

# Graph Display Configuration
NEXT_PUBLIC_GRAPH_DISPLAY_MODE=tooltip
```

#### Optional Environment Variables (for file uploads)

```bash
# UploadThing Configuration (optional)
UPLOADTHING_TOKEN=your-uploadthing-token
UPLOADTHING_APP_NAME=your-uploadthing-app-name
```

### Generate Secure Keys

For the API keys and admin password, use strong, randomly generated values:

```bash
# Example secure values (generate your own!)
API_KEY=apikey1234567890abcdef
NEXT_PUBLIC_API_KEY=apikey1234567890abcdef
ADMIN_PASSWORD=MySecureAdminPassword123!
```

### Deploy

1. After setting environment variables, click "Deploy"
2. Vercel will build and deploy your application automatically
3. Your app will be available at `https://your-app-name.vercel.app`

## Post-Deployment Setup

### Test the Application

1. Visit your deployed application
2. Try creating a collection (use the settings gear icon)
3. Add some test entries with different types (text, audio, images, YouTube/Spotify URLs)
4. Verify the graph visualization works

### Admin Access

1. Click the settings gear icon
2. Sign in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. You should see admin features enabled

## 4. Optional Services Setup

### UploadThing (for file uploads)

1. Go to [UploadThing](https://uploadthing.com)
2. Create an account and new app
3. Get your token and app name
4. Add them to your Vercel environment variables
5. Redeploy the application

### Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's instructions to configure DNS

## 5. Environment Variables Reference

### Complete Environment Variables List

```bash
# Database
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
DATABASE_TABLE_NAME=entries

# OpenAI
OPENAI_API_KEY=sk-1234567890abcdef

# Authentication
API_KEY=your-secure-api-key
NEXT_PUBLIC_API_KEY=your-secure-api-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Optional: File Uploads
UPLOADTHING_TOKEN=your-uploadthing-token
UPLOADTHING_APP_NAME=your-app-name

# Optional: UI Configuration
NEXT_PUBLIC_GRAPH_DISPLAY_MODE=tooltip
```

## 6. Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify your `DATABASE_URL` is correct
   - Ensure the Supabase project is running
   - Check that pgvector extension is enabled

2. **OpenAI API Errors**
   - Verify your `OPENAI_API_KEY` is valid
   - Check you have sufficient OpenAI API credits

3. **Build Failures**
   - Check all required environment variables are set
   - Verify there are no syntax errors in the code

4. **Admin Login Issues**
   - Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
   - Try clearing browser cookies and cache

### Database Queries for Debugging

```sql
-- Check if entries table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'entries';

-- Check if pgvector extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- View sample entries
SELECT id, data, collection, created_at FROM entries LIMIT 5;

-- Check entry count by collection
SELECT collection, COUNT(*) FROM entries GROUP BY collection;
```

## 7. Security Considerations

1. **Use strong passwords** for admin access
2. **Keep API keys secure** - never commit them to version control
3. **Use environment-specific prefixes** for database table names if needed
4. **Regularly rotate API keys** and admin passwords
5. **Monitor usage** of OpenAI API to prevent unexpected charges

## 8. Scaling Considerations

1. **Database Performance**: Add appropriate indexes as your data grows
2. **OpenAI API Limits**: Consider implementing rate limiting for embedding generation
3. **File Storage**: Consider upgrading UploadThing plan for larger file volumes
4. **Vercel Limits**: Monitor function execution time and bandwidth usage

## 9. Backup and Maintenance

1. **Database Backups**: Supabase provides automatic backups
2. **Environment Variables**: Keep a secure record of your configuration
3. **Monitoring**: Set up alerts for API failures and database issues
4. **Updates**: Regularly update dependencies for security patches

---

Your Park Commonbase application should now be successfully deployed and running on Vercel with Supabase!

For support or questions, check the GitHub issues or create a new one.