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

```
NEXTAUTH_URL=https://your-site.netlify.app
NEXTAUTH_SECRET=your-secret-here-min-32-chars
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
OPENAI_API_KEY=your-openai-api-key
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
TAVILY_API_KEY=your-tavily-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Deployment Steps

1. **Connect your repository to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect to your Git provider and select this repository

2. **Configure Build Settings** (should be auto-detected from `netlify.toml`)
   - Build command: `npm run build`
   - Publish directory: `.next`
   - The build will automatically run `prisma generate` before building

3. **Set Environment Variables**
   - In Netlify dashboard, go to Site Settings > Environment Variables
   - Add all required environment variables listed above
   - **Important**: Make sure `DATABASE_URL` points to your PostgreSQL database

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your application

5. **Initialize Database Schema**
   - After first deployment, run database migrations:
   ```bash
   # Using Netlify CLI locally with your DATABASE_URL
   DATABASE_URL=your-production-database-url npx prisma db push
   ```
   - Or use your database provider's migration tools

### Troubleshooting

#### Build Fails with Database Connection Error
- This is normal during build if the database doesn't exist yet
- Make sure your `DATABASE_URL` is correct
- Initialize the database schema using `prisma db push` after deployment

#### "Module not found: Can't resolve '@prisma/client'"
- The build script now includes `prisma generate` which should fix this
- If still occurring, check that `postinstall` script runs successfully

#### Functions Timeout or Database Errors
- Ensure your PostgreSQL database is accessible from Netlify
- Check that connection string includes `?schema=public` or appropriate schema
- Verify all required environment variables are set in Netlify

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
