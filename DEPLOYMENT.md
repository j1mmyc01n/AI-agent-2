# Deployment Guide

## Netlify Deployment

This application is configured to deploy on Netlify with the following setup:

### Prerequisites

1. **PostgreSQL Database** - SQLite is not compatible with Netlify's serverless architecture. You need a PostgreSQL database from:
   - [Neon](https://neon.tech) (Recommended - Free tier available)
   - [Supabase](https://supabase.com) (Free tier available)
   - [Railway](https://railway.app)
   - [Heroku Postgres](https://www.heroku.com/postgres)

2. **Required Environment Variables** - Set these in Netlify's dashboard under Site Settings > Environment Variables:

```bash
# CRITICAL - Required for the application to start:
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
NEXTAUTH_SECRET=your-secret-here-min-32-chars
NEXTAUTH_URL=https://your-site.netlify.app

# Optional but recommended for full functionality:
OPENAI_API_KEY=your-openai-api-key
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
TAVILY_API_KEY=your-tavily-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**⚠️ CRITICAL NOTES:**
- **DATABASE_URL**: Must be set in Netlify UI, NOT in netlify.toml (build command uses a dummy URL)
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32` - must be at least 32 characters
- **NEXTAUTH_URL**: Must match your actual Netlify site URL (e.g., https://dobetteragent2.netlify.app)
- If these are missing, the app will show clear error messages in the logs

### Deployment Steps

1. **Connect your repository to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect to your Git provider and select this repository

2. **Configure Build Settings** (auto-detected from `netlify.toml`)
   - Build command: Uses inline DATABASE_URL for Prisma generation
   - The `@netlify/plugin-nextjs` plugin handles the publish directory automatically
   - Build will succeed even without runtime environment variables

3. **Set Runtime Environment Variables** ⚠️ REQUIRED
   - In Netlify dashboard, go to **Site Settings > Environment Variables**
   - Add ALL THREE critical variables:
     - `DATABASE_URL` - Your PostgreSQL connection string
     - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
     - `NEXTAUTH_URL` - Your Netlify site URL (check deploy logs for exact URL)
   - Add optional variables for additional features

4. **Deploy**
   - Click "Deploy site"
   - Build will succeed
   - **First deploy will fail at runtime** if environment variables aren't set
   - Set the environment variables and trigger a redeploy

5. **Initialize Database Schema**
   - After setting `DATABASE_URL`, initialize your database:
   ```bash
   # Using your production DATABASE_URL
   DATABASE_URL=your-production-database-url npx prisma db push
   ```
   - Or use your database provider's migration tools

### Troubleshooting

#### "Application error: a server-side exception has occurred"
This is the error you'll see if required environment variables are missing. Check the function logs:

1. Go to Netlify dashboard > Functions
2. Check the logs for specific error messages:
   - `❌ ERROR: DATABASE_URL environment variable is not set!`
   - `❌ ERROR: NEXTAUTH_SECRET environment variable is not set!`
   - `❌ ERROR: NEXTAUTH_URL environment variable is not set!`
3. Set the missing variables in Site Settings > Environment Variables
4. Redeploy or wait for automatic deploy

#### Database Connection Errors at Runtime
- Ensure your PostgreSQL database is accessible from Netlify's network
- Check that connection string includes `?schema=public` or appropriate schema
- Verify the database exists and has the correct schema (run `prisma db push`)
- Check Netlify function logs for specific error messages

#### GitHub OAuth Not Working
- GitHub OAuth is optional - app will work without it
- Only includes GitHub provider if `GITHUB_ID` and `GITHUB_SECRET` are set
- Users can still register/login with email and password

#### Chat/AI Features Not Working
- `OPENAI_API_KEY` is required for chat functionality
- Users can also set their own API keys in Settings
- Web search requires `TAVILY_API_KEY`

### Local Development

For local development, you can still use SQLite:

1. Create a `.env.local` file:
```
DATABASE_URL="file:./dev.db"
```

2. Run database setup:
```bash
npx prisma db push
```

3. Start development server:
```bash
npm run dev
```

### Additional Resources

- [Netlify Next.js Documentation](https://docs.netlify.com/frameworks/next-js/overview/)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
