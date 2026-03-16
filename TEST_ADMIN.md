# Test Admin Login

For development and testing purposes, when the database is not configured, you can use the following test admin credentials to access the application:

## Test Admin Credentials

**Email:** `admin@test.com`
**Password:** `admin123456`

## How It Works

The application automatically falls back to test admin authentication when:
- `DATABASE_URL` environment variable is not set
- You're building or testing the application locally without a database

## Usage

1. Navigate to the login page at `/login`
2. Enter the test admin credentials:
   - Email: `admin@test.com`
   - Password: `admin123456`
3. Click "Sign in"

You'll be logged in as "Test Admin" and can access the application interface.

## What Works Without a Database

When logged in with the test admin (no `DATABASE_URL` configured):

✅ **Working Features:**
- Login/logout functionality
- Basic navigation and UI
- Settings page interface

❌ **Limited Features (require database):**
- **Conversations**: Cannot be saved or loaded (returns empty list)
- **Chat History**: Chat messages cannot be persisted
- **Projects**: Cannot be saved to database
- **API Integrations**: Cannot persist your API keys (OpenAI, GitHub, Vercel, Tavily)

The application will display helpful error messages when you try to use features that require a database.

## Setting Up Your Own Database

To unlock all features and persist your data, you need to set up your own PostgreSQL database:

### Option 1: Free PostgreSQL Database (Recommended for Testing)

1. **Get a free database from Neon.tech:**
   - Go to [https://neon.tech](https://neon.tech)
   - Create a free account
   - Create a new project
   - Copy the connection string (it looks like: `postgresql://user:password@host.region.neon.tech/database?sslmode=require`)

2. **Set the DATABASE_URL environment variable:**
   - For local development: Add to `.env.local`:
     ```
     DATABASE_URL="postgresql://user:password@host.region.neon.tech/database?sslmode=require"
     ```
   - For Netlify deployment: Add in Site Settings > Environment Variables

3. **Initialize the database:**
   ```bash
   npm run db:push
   ```

### Option 2: Other PostgreSQL Providers

You can use any PostgreSQL database provider:
- **Supabase**: [https://supabase.com](https://supabase.com) (Free tier available)
- **Railway**: [https://railway.app](https://railway.app) (Free tier available)
- **Render**: [https://render.com](https://render.com) (Free tier available)
- **Heroku Postgres**: [https://www.heroku.com/postgres](https://www.heroku.com/postgres)
- **Local PostgreSQL**: Install PostgreSQL on your machine

All require a PostgreSQL connection string in the format:
```
postgresql://username:password@hostname:5432/database_name?schema=public
```

## Why Each User Needs Their Own Database

**Important:** This application is designed so that **each user sets up their own database**. This means:

- ✅ Your data stays private and under your control
- ✅ You own your conversation history and API keys
- ✅ No shared infrastructure or multi-tenant concerns
- ✅ You can backup and export your own data
- ✅ You're in control of your data security and privacy

**You should NOT share your `DATABASE_URL` with other users**. Each person who uses this application should set up their own database.

## After Setting Up Your Database

Once you configure `DATABASE_URL`:

1. The test admin login still works as a fallback when the database is unreachable
2. You can create real user accounts via the `/register` page
3. All features will be fully functional
4. Your API keys, conversations, and projects will be saved to YOUR database

## Important Notes

⚠️ **Security Warning**: The test admin account is only available when `DATABASE_URL` is not configured. Once you configure a real database, you should create actual user accounts through the registration process.

⚠️ **Development Only**: This test admin feature is intended for development and testing only. For production use, always configure a proper database with real user accounts.

⚠️ **No Data Persistence**: When using test admin without a database, nothing is saved. Your API keys, conversations, and projects will be lost when you log out or refresh the page.

## Quick Start Workflow

**For quick testing (no database):**
1. Use test admin login (`admin@test.com` / `admin123456`)
2. Explore the UI and interface
3. Note that data-dependent features will show helpful messages

**For full functionality:**
1. Set up a PostgreSQL database (free options available)
2. Configure `DATABASE_URL` environment variable
3. Run `npm run db:push` to initialize the schema
4. Create a real user account via `/register`
5. Log in with your real account
6. Configure your API keys in Settings > Integrations
7. Start using all features with full data persistence
