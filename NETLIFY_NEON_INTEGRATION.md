# Netlify Neon Integration Support

## Overview

This application now supports Netlify's native Neon database integration, which automatically creates and configures PostgreSQL database environment variables for your Netlify deployments.

## What Changed

### Automatic Detection of Netlify Database Variables

The application now checks for database URLs in the following priority order:

1. **`DATABASE_URL`** - Standard environment variable (for manual configuration)
2. **`NETLIFY_DATABASE_URL`** - Netlify Neon integration pooled connection (recommended for serverless)
3. **`NETLIFY_DATABASE_URL_UNPOOLED`** - Netlify Neon integration unpooled connection (fallback)

### Why This Matters

When you use Netlify's Neon integration:
- Netlify creates `NETLIFY_DATABASE_URL` and `NETLIFY_DATABASE_URL_UNPOOLED` automatically
- You don't need to manually set `DATABASE_URL`
- The pooled connection (`NETLIFY_DATABASE_URL`) is better for serverless environments
- Your application will "just work" without additional configuration

## How to Use Netlify Neon Integration

### Option 1: Use Netlify's Neon Integration (Recommended)

1. Go to your Netlify site dashboard
2. Navigate to **Integrations** tab
3. Search for and install the **Neon** integration
4. Netlify will automatically:
   - Create a free Neon PostgreSQL database
   - Set `NETLIFY_DATABASE_URL` and `NETLIFY_DATABASE_URL_UNPOOLED` environment variables
   - Configure the database for all deploy contexts

5. Initialize the database schema (run once locally):
   ```bash
   # Use the NETLIFY_DATABASE_URL from your Netlify environment variables
   DATABASE_URL="your-netlify-database-url" npx prisma db push
   ```

6. Redeploy your site - it will now connect to the database automatically

### Option 2: Manual Configuration (Still Supported)

You can still manually set `DATABASE_URL` if you prefer:

1. Get a PostgreSQL database from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
2. Set `DATABASE_URL` in Netlify UI (Site Settings > Environment Variables)
3. Initialize schema: `DATABASE_URL="..." npx prisma db push`
4. Redeploy

## Technical Details

### Database URL Resolution Logic

Located in `src/lib/db.ts`:

```typescript
function getDatabaseUrl(): string | undefined {
  // 1. Check standard DATABASE_URL first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 2. Check Netlify Neon integration variables
  // Use pooled connection (better for serverless)
  if (process.env.NETLIFY_DATABASE_URL) {
    return process.env.NETLIFY_DATABASE_URL;
  }

  // 3. Fall back to unpooled if pooled is not available
  if (process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
    return process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  }

  return undefined;
}
```

### Files Modified

The following files were updated to use `getDatabaseUrl()` instead of directly checking `process.env.DATABASE_URL`:

1. **`src/lib/db.ts`** - Added `getDatabaseUrl()` function and exported it
2. **`src/lib/auth.ts`** - Updated to use `getDatabaseUrl()` for PrismaAdapter and test admin fallback
3. **`src/app/api/auth/register/route.ts`** - Updated database availability check
4. **`src/app/api/chat/route.ts`** - Updated database availability check
5. **`src/app/api/conversations/route.ts`** - Updated database availability check
6. **`src/app/api/conversations/[id]/route.ts`** - Updated database availability check
7. **`src/app/api/integrations/route.ts`** - Updated database availability check
8. **`src/app/api/projects/route.ts`** - Updated database availability check

### Backward Compatibility

✅ **Fully backward compatible**
- Existing deployments with `DATABASE_URL` continue to work without changes
- Manual `DATABASE_URL` takes priority over Netlify variables
- No migration or reconfiguration required

## Benefits

### For Netlify Deployments

1. **Zero Configuration** - Netlify integration sets everything up automatically
2. **Optimal Performance** - Uses pooled connections for serverless
3. **Automatic Provisioning** - Database created and configured for you
4. **Free Tier** - Neon offers a generous free tier
5. **Multiple Environments** - Separate databases for production, preview, and branch deploys (if configured)

### For Developers

1. **Faster Setup** - No need to manually create database and copy connection strings
2. **Less Error-Prone** - Eliminates manual copy-paste errors
3. **Better DX** - Deploy and forget
4. **Flexible** - Can still use manual configuration if preferred

## Troubleshooting

### How to Check Which Variable Is Being Used

The application logs which database variable it detects at startup. Check your Netlify function logs:

```
⚠️ WARNING: No database URL found!
```

Or see the warning that lists available options:
```
Please set one of these environment variables:
  - DATABASE_URL (standard)
  - NETLIFY_DATABASE_URL (Netlify Neon integration - pooled)
  - NETLIFY_DATABASE_URL_UNPOOLED (Netlify Neon integration - unpooled)
```

### Common Issues

**Issue**: "Database not configured" error after installing Neon integration

**Solution**:
1. Verify environment variables exist: Netlify Dashboard > Site Settings > Environment Variables
2. Check that `NETLIFY_DATABASE_URL` or `NETLIFY_DATABASE_URL_UNPOOLED` is set
3. Initialize database schema: `DATABASE_URL="..." npx prisma db push`
4. Redeploy the site (trigger a new build)

**Issue**: Build fails with Prisma error

**Solution**: Netlify builds require a valid PostgreSQL URL for `prisma generate`. The app provides a dummy URL during build time, so this should not be an issue. If it persists, check the build logs.

## Environment Variables Reference

| Variable | Source | Purpose | Priority |
|----------|--------|---------|----------|
| `DATABASE_URL` | Manual | Standard database URL | 1 (Highest) |
| `NETLIFY_DATABASE_URL` | Neon Integration | Pooled connection (serverless-optimized) | 2 |
| `NETLIFY_DATABASE_URL_UNPOOLED` | Neon Integration | Direct connection | 3 (Lowest) |

## Additional Resources

- [Netlify Neon Integration Docs](https://docs.netlify.com/integrations/neon/)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

**Status**: ✅ COMPLETE - Application now supports Netlify Neon integration alongside manual configuration
