# Database Setup Guide

This guide explains how to set up a PostgreSQL database for AgentForge to fix the "Login details missing from database and sign up not working" issue.

## Problem

The application requires a PostgreSQL database to store user accounts and authentication data. Without a properly configured database:

- User registration will fail with a "Database is not configured" error
- Login will only work with the test admin account (`admin@test.com` / `admin123456`)
- No user data will be persisted
- Projects, conversations, and other features won't work

## Solution: Set Up PostgreSQL Database

### ⚡ EASIEST: Netlify Neon Integration (Recommended for Production)

**If deploying to Netlify, this is by far the easiest option** - the database is created and configured automatically!

1. Go to your Netlify site dashboard
2. Navigate to **Integrations** tab
3. Search for and install the **Neon** integration
4. Netlify will automatically:
   - Create a free Neon PostgreSQL database
   - Set `NETLIFY_DATABASE_URL` and `NETLIFY_DATABASE_URL_UNPOOLED` environment variables
   - Configure the database for all deploy contexts

5. Initialize the database schema (run once locally):
   ```bash
   # Get the NETLIFY_DATABASE_URL from your Netlify environment variables
   # Then run:
   DATABASE_URL="your-netlify-database-url" npx prisma db push
   ```

6. Redeploy your site - **it will now connect to the database automatically!**

**That's it!** The application automatically detects `NETLIFY_DATABASE_URL` and uses it.

**How it works:** The application checks for database URLs in this priority order:
1. `DATABASE_URL` (standard, manually set)
2. `NETLIFY_DATABASE_URL` (Netlify Neon integration - pooled connection)
3. `NETLIFY_DATABASE_URL_UNPOOLED` (Netlify Neon integration - direct connection)

For more details, see [NETLIFY_NEON_INTEGRATION.md](NETLIFY_NEON_INTEGRATION.md)

---

### Other Options

You have several other options if not using Netlify or for local development:

#### Option 1: Neon (Manual Setup for Local Development)

[Neon](https://neon.tech) provides a generous free tier with serverless PostgreSQL.

1. **Sign up** at https://neon.tech
2. **Create a new project**
3. **Copy the connection string** from your project dashboard
   - It will look like: `postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. **Add to your environment**:
   ```bash
   # For local development, create .env.local file:
   echo 'DATABASE_URL="postgresql://your-connection-string"' > .env.local
   ```

#### Option 2: Supabase

[Supabase](https://supabase.com) offers free PostgreSQL databases with additional features.

1. **Sign up** at https://supabase.com
2. **Create a new project**
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (Direct connection)
5. **Add to .env.local**:
   ```bash
   DATABASE_URL="postgresql://your-connection-string"
   ```

#### Option 3: Railway

[Railway](https://railway.app) provides easy PostgreSQL hosting.

1. **Sign up** at https://railway.app
2. **Create a new project** → **Add PostgreSQL**
3. Click on the **PostgreSQL service** → **Connect** tab
4. Copy the **PostgreSQL Connection URL**
5. **Add to .env.local**:
   ```bash
   DATABASE_URL="postgresql://your-connection-string"
   ```

#### Option 4: Local PostgreSQL

If you prefer running PostgreSQL locally:

1. **Install PostgreSQL**:
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14

   # Ubuntu/Debian
   sudo apt-get install postgresql
   sudo systemctl start postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create a database**:
   ```bash
   psql postgres
   CREATE DATABASE agentforge;
   CREATE USER agentforge_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE agentforge TO agentforge_user;
   \q
   ```

3. **Add to .env.local**:
   ```bash
   DATABASE_URL="postgresql://agentforge_user:your_password@localhost:5432/agentforge?schema=public"
   ```

## Configuration Steps

### 1. Create Environment File

Create a `.env.local` file in the project root:

```bash
# Generate a secure NextAuth secret
openssl rand -base64 32

# Create .env.local with your values
cat > .env.local << 'EOF'
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste-generated-secret-here>
DATABASE_URL="postgresql://your-connection-string-here"
EOF
```

### 2. Apply Database Schema

Run Prisma migrations to create the necessary tables:

```bash
# Push the schema to your database
npm run db:push

# Or use migrations (recommended for production)
npx prisma migrate dev --name init
```

### 3. Verify Setup

Check that everything is configured correctly:

```bash
# Verify environment variables
npm run check-env

# Test the database connection
npx prisma db pull
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and try:
- Creating a new account at http://localhost:3000/register
- Logging in at http://localhost:3000/login

## Production Deployment (Netlify)

For production deployments on Netlify:

### Using Netlify Neon Integration (Easiest)

1. Go to your Netlify site dashboard
2. Navigate to **Integrations** tab
3. Search for and enable **Neon** integration
4. The integration automatically sets `NETLIFY_DATABASE_URL` environment variable
5. Deploy your site - no additional configuration needed!

### Manual Database Configuration

1. Create a production PostgreSQL database (Neon, Supabase, Railway, etc.)
2. In Netlify dashboard → **Site Settings** → **Environment Variables**
3. Add the following variables:
   ```
   DATABASE_URL=postgresql://your-production-connection-string
   NEXTAUTH_URL=https://your-site.netlify.app
   NEXTAUTH_SECRET=<your-generated-secret>
   ```
4. **Important**: Run migrations before deploying:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```
5. Trigger a new deploy

## Troubleshooting

### Error: "Database is not configured"

**Cause**: `DATABASE_URL` environment variable is not set.

**Solution**:
1. Ensure `.env.local` exists with a valid `DATABASE_URL`
2. Restart your development server: `npm run dev`

### Error: "Can't reach database server"

**Cause**: Database connection string is incorrect or database is not accessible.

**Solution**:
1. Verify your connection string is correct
2. Check if your IP is whitelisted (for cloud databases)
3. Ensure database is running (for local databases)

### Error: "Environment variable not found: DATABASE_URL"

**Cause**: `.env.local` is not being loaded by Prisma CLI.

**Solution**: Use inline environment variable:
```bash
DATABASE_URL="your-url" npx prisma db push
```

### Error: "Table does not exist"

**Cause**: Database schema hasn't been applied.

**Solution**: Run migrations:
```bash
npm run db:push
# or
npx prisma migrate dev
```

### Registration works but login fails

**Cause**: Password might not be hashed correctly, or session configuration issue.

**Solution**:
1. Check server logs for specific errors
2. Verify `NEXTAUTH_SECRET` is set
3. Clear browser cookies and try again
4. Check database to ensure user was created: `npx prisma studio`

## Database Schema

The application uses the following main tables:

- **User**: Stores user accounts with email, hashed password, and profile info
- **Account**: Stores OAuth provider connections (GitHub, etc.)
- **Session**: Manages user sessions (when using database sessions)
- **Conversation**: Stores chat conversations
- **Message**: Stores individual messages in conversations
- **Project**: Stores user projects

You can view and edit your database using Prisma Studio:

```bash
npm run db:studio
```

This opens a web interface at http://localhost:5555 where you can browse and edit your data.

## Security Best Practices

1. **Never commit `.env.local`** to version control (already in `.gitignore`)
2. **Use strong passwords** for database users
3. **Rotate secrets regularly** in production
4. **Use connection pooling** for serverless environments (Neon's pooled URLs)
5. **Enable SSL** for database connections (add `?sslmode=require` to connection string)
6. **Restrict database access** by IP when possible

## Quick Reference

```bash
# Check environment setup
npm run check-env

# Apply schema changes
npm run db:push

# Create a migration
npx prisma migrate dev --name description

# Open database browser
npm run db:studio

# Generate Prisma Client
npx prisma generate

# View database status
npx prisma migrate status
```

## Need Help?

- Check the [Prisma Documentation](https://www.prisma.io/docs)
- Review [NextAuth.js Documentation](https://next-auth.js.org)
- See [Neon Documentation](https://neon.tech/docs) for database-specific help
