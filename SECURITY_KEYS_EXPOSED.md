# 🚨 URGENT: Your API Keys Have Been Exposed

## Immediate Actions Required

Your API keys were publicly shared and need to be revoked immediately:

### 1. Revoke GitHub Token (RIGHT NOW)
1. Go to: https://github.com/settings/tokens
2. Find the token ending in `...w6CDyr2G`
3. Click **Delete** or **Revoke**
4. Generate a new one (see instructions below)

### 2. Revoke OpenAI API Key (RIGHT NOW)
1. Go to: https://platform.openai.com/api-keys
2. Find the key starting with `sk-proj-nWJzD0...`
3. Click **Revoke**
4. Generate a new one (see instructions below)

## How to Securely Set Up API Keys

### For Netlify Deployment

**DO NOT** put API keys in code or commit them. Instead:

1. **Go to Netlify Dashboard**
   - https://app.netlify.com
   - Select your site (dobetteragent or dobetteragent2)
   - Go to **Site Settings** > **Environment Variables**

2. **Add these variables:**

   ```
   OPENAI_API_KEY=your-new-openai-key-here
   GITHUB_TOKEN=your-new-github-token-here (if needed for the app)
   ```

### For Local Development

1. **Create `.env.local` file** (this file is gitignored - it won't be committed):

   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** and add your keys:

   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-min-32-chars
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY=your-new-openai-key
   GITHUB_TOKEN=your-new-github-token (if needed)
   ```

3. **Never commit `.env.local`** - it's already in `.gitignore`

## Generate New API Keys Securely

### New GitHub Token
1. Go to: https://github.com/settings/tokens?type=beta
2. Click **Generate new token** > **Fine-grained token**
3. Set:
   - Token name: "AI Agent App"
   - Expiration: 90 days (or your preference)
   - Repository access: Select specific repositories
   - Permissions: Only what you need (e.g., repo read/write)
4. Click **Generate token**
5. **Copy immediately** and save to Netlify (or `.env.local` for local dev)

### New OpenAI API Key
1. Go to: https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Name it: "AI Agent App"
4. **Copy immediately** (you won't see it again)
5. Save to Netlify (or `.env.local` for local dev)

## Security Best Practices

✅ **DO:**
- Store keys in Netlify environment variables (for production)
- Store keys in `.env.local` (for local development)
- Use different keys for development vs production
- Set expiration dates on tokens
- Revoke unused tokens

❌ **DON'T:**
- Commit API keys to Git
- Share keys in chat/messages
- Use the same key across multiple environments
- Store keys in code files
- Push `.env` or `.env.local` to Git

## Check Your Setup

After setting up keys properly, run:

```bash
npm run check-env
```

This validates your environment variables without exposing the values.

## If You've Already Committed Keys

If you accidentally committed keys to Git history:

1. **Revoke the keys immediately** (most important!)
2. Generate new keys
3. Update your environment variables
4. Consider using `git filter-branch` or BFG Repo-Cleaner to remove from history
5. Force push the cleaned history (be careful with team repos)

## Questions?

See:
- [SETUP_ENVIRONMENT.md](SETUP_ENVIRONMENT.md) - Complete setup guide
- [GitHub Token Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [OpenAI API Keys](https://platform.openai.com/docs/api-reference/authentication)
