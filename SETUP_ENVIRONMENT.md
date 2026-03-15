# Environment Variables Setup Guide

## Current Status: Server Error Because Environment Variables Are Not Set

Your build is succeeding, but the application is failing at runtime because the required environment variables are not configured in Netlify. This guide will help you set them up.

## Step 1: Generate Required Secrets

Run these commands on your local machine:

```bash
# Generate NEXTAUTH_SECRET (must be at least 32 characters)
openssl rand -base64 32
```

Copy the output - this is your `NEXTAUTH_SECRET`.

## Step 2: Get Your Database URL

You need a PostgreSQL database. Choose one of these free options:

### Option A: Neon (Recommended - Easiest)
1. Go to https://neon.tech
2. Sign up/Login
3. Create a new project
4. Copy the connection string (it will look like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
5. This is your `DATABASE_URL`

### Option B: Supabase
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings > Database
4. Copy the "Connection string" under "Connection pooling" (Transaction mode)
5. Replace `[YOUR-PASSWORD]` with your actual password
6. This is your `DATABASE_URL`

### Option C: Railway
1. Go to https://railway.app
2. Create a new project
3. Add PostgreSQL database
4. Copy the connection string from the database settings
5. This is your `DATABASE_URL`

## Step 3: Set Environment Variables in Netlify

### Navigate to Netlify Dashboard
1. Go to https://app.netlify.com
2. Select your site (dobetteragent or dobetteragent2)
3. Go to **Site settings** > **Environment variables**

### Add These CRITICAL Variables (Required)

Click "Add a variable" for each of these:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `DATABASE_URL` | Your PostgreSQL connection string from Step 2 | `postgresql://user:pass@host.neon.tech/db` |
| `NEXTAUTH_SECRET` | The secret you generated in Step 1 | (32+ character string) |
| `NEXTAUTH_URL` | Your Netlify site URL | `https://dobetteragent2.netlify.app` or `https://dobetteragent.netlify.app` |

**Important Notes:**
- For `NEXTAUTH_URL`, use the exact URL where your site is deployed (check your Netlify dashboard for the URL)
- Do NOT include trailing slash in NEXTAUTH_URL
- Make sure DATABASE_URL starts with `postgresql://` (not `postgres://`)

### Add These OPTIONAL Variables (For Full Functionality)

| Variable Name | Purpose | How to Get |
|--------------|---------|-----------|
| `OPENAI_API_KEY` | AI chat features | Get from https://platform.openai.com/api-keys |
| `GITHUB_ID` | GitHub OAuth login | Create OAuth app at https://github.com/settings/developers |
| `GITHUB_SECRET` | GitHub OAuth login | From the same OAuth app |
| `TAVILY_API_KEY` | Web search in AI | Get from https://tavily.com |

## Step 4: Initialize Database

After setting the environment variables, initialize your database schema:

```bash
# Install Prisma CLI if you haven't
npm install -g prisma

# Set your DATABASE_URL and initialize the database
DATABASE_URL="your-postgresql-connection-string" npx prisma db push
```

Or if you prefer not to install globally:

```bash
# From the project directory
DATABASE_URL="your-postgresql-connection-string" npx prisma db push
```

## Step 5: Redeploy Your Site

After setting all environment variables:

1. Go back to your Netlify dashboard
2. Click **Deploys** tab
3. Click **Trigger deploy** > **Clear cache and deploy site**
4. Wait for the deploy to complete
5. Visit your site URL - it should now work!

## Troubleshooting

### Still seeing "Application error: a server-side exception has occurred"?

1. Go to Netlify dashboard > **Functions** tab
2. Click on any function to see the logs
3. Look for error messages like:
   - `❌ ERROR: DATABASE_URL environment variable is not set!`
   - `❌ ERROR: NEXTAUTH_SECRET environment variable is not set!`
   - `❌ ERROR: NEXTAUTH_URL environment variable is not set!`
4. The error message will tell you exactly which variable is missing
5. Set the missing variable in Site Settings > Environment Variables
6. Trigger a new deploy

### Database connection errors?

Make sure your `DATABASE_URL`:
- Starts with `postgresql://` (not `postgres://`)
- Includes the correct password
- Is accessible from the internet (check firewall rules)
- Has been initialized with `prisma db push`

### Still stuck?

Check the full logs:
1. Netlify dashboard > **Deploys** tab
2. Click on the latest deploy
3. Scroll down to "Function logs" section
4. Look for specific error messages

## Quick Checklist

- [ ] Generated NEXTAUTH_SECRET with `openssl rand -base64 32`
- [ ] Created PostgreSQL database (Neon/Supabase/Railway)
- [ ] Set DATABASE_URL in Netlify environment variables
- [ ] Set NEXTAUTH_SECRET in Netlify environment variables
- [ ] Set NEXTAUTH_URL in Netlify environment variables (with your actual site URL)
- [ ] Initialized database with `prisma db push`
- [ ] Triggered a new deploy in Netlify
- [ ] Checked function logs if still having issues

## Example: Complete Setup for Neon Database

```bash
# 1. Generate secret
openssl rand -base64 32
# Output: abc123xyz789....(copy this)

# 2. Go to Neon.tech, create project, copy connection string
# Example: postgresql://neondb_owner:abc123@ep-cool-voice.us-east-2.aws.neon.tech/neondb?sslmode=require

# 3. In Netlify UI, add these variables:
# DATABASE_URL = postgresql://neondb_owner:abc123@ep-cool-voice.us-east-2.aws.neon.tech/neondb?sslmode=require
# NEXTAUTH_SECRET = abc123xyz789.... (from step 1)
# NEXTAUTH_URL = https://dobetteragent2.netlify.app

# 4. Initialize database locally
DATABASE_URL="postgresql://neondb_owner:abc123@ep-cool-voice.us-east-2.aws.neon.tech/neondb?sslmode=require" npx prisma db push

# 5. Trigger deploy in Netlify
# Done! Your app should now work.
```
