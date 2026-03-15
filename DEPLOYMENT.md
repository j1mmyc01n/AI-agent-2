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
# Required for runtime (set in Netlify UI)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
NEXTAUTH_URL=https://your-site.netlify.app
NEXTAUTH_SECRET=your-secret-here-min-32-chars

# API Keys (set in Netlify UI)
OPENAI_API_KEY=your-openai-api-key
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
TAVILY_API_KEY=your-tavily-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**Important Notes:**
- The build process uses a dummy `DATABASE_URL` (configured in `netlify.toml`) since Prisma client generation doesn't require an actual database connection
- Runtime requires the real `DATABASE_URL` to be set in Netlify UI environment variables
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`

### Deployment Steps

1. **Connect your repository to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect to your Git provider and select this repository

2. **Configure Build Settings** (auto-detected from `netlify.toml`)
   - Build command: `npm run build`
   - The `@netlify/plugin-nextjs` plugin handles the publish directory automatically
   - Build includes `prisma generate` which runs with the dummy DATABASE_URL

3. **Set Environment Variables**
   - In Netlify dashboard, go to Site Settings > Environment Variables
   - Add all required runtime environment variables listed above
   - **Critical**: Set the real `DATABASE_URL` pointing to your PostgreSQL database
   - Set `NEXTAUTH_URL` to your actual Netlify site URL
   - Generate and set a secure `NEXTAUTH_SECRET`

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your application
   - The build should succeed even before setting runtime environment variables

5. **Initialize Database Schema**
   - After first deployment and setting `DATABASE_URL`, initialize your database:
   ```bash
   # Using your production DATABASE_URL
   DATABASE_URL=your-production-database-url npx prisma db push
   ```
   - Or use your database provider's migration tools

### Troubleshooting

#### Build Succeeds but Runtime Fails
- Verify all runtime environment variables are set in Netlify UI (Site Settings > Environment Variables)
- Check that `DATABASE_URL` points to an accessible PostgreSQL database
- Ensure `NEXTAUTH_SECRET` is at least 32 characters long
- Confirm `NEXTAUTH_URL` matches your Netlify site URL

#### "Module not found: Can't resolve '@prisma/client'"
- The build script includes `prisma generate` in both postinstall and build steps
- Check Netlify build logs to confirm `prisma generate` ran successfully
- Verify `@prisma/client` and `prisma` packages are in dependencies (not devDependencies)

#### Database Connection Errors at Runtime
- Ensure your PostgreSQL database is accessible from Netlify's network
- Check that connection string includes `?schema=public` or appropriate schema
- Verify the database exists and has the correct schema (run `prisma db push`)
- Check Netlify function logs for specific error messages

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
