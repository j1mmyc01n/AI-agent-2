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

You'll be logged in as "Test Admin" and can access all features of the application.

## Important Notes

⚠️ **Security Warning**: This test admin account is only available when `DATABASE_URL` is not configured. Once you configure a real database, you'll need to create actual user accounts through the registration process.

⚠️ **Development Only**: This feature is intended for development and testing only. Do not rely on it in production environments.

## When You're Ready for Production

1. Set up a PostgreSQL database (see `DEPLOYMENT.md` for instructions)
2. Configure the `DATABASE_URL` environment variable
3. The test admin fallback will automatically disable
4. Create real user accounts through the `/register` page or database seeding

## Alternative: Database Seeding

If you want to create a proper admin user in the database, you can:

1. Set up your `DATABASE_URL`
2. Run database migrations: `npm run db:push`
3. Use the registration page to create an admin account with a real email and password

This provides a more realistic testing environment while still in development.
