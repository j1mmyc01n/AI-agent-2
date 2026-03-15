#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Run this script to check if all required environment variables are set.
 * This helps debug deployment issues.
 */

const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

console.log(chalk.bold('\n🔍 Environment Variable Validation\n'));
console.log('Checking required and optional environment variables...\n');

// Define required and optional variables
const requiredVars = [
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
    example: 'postgresql://user:password@host:5432/database?schema=public',
    validation: (value) => {
      if (!value) return { valid: false, message: 'Not set' };
      if (!value.startsWith('postgresql://')) {
        return { valid: false, message: 'Must start with postgresql://' };
      }
      if (value.includes('localhost:5432')) {
        return { valid: false, message: 'Still using dummy localhost URL - update with real database' };
      }
      return { valid: true, message: 'Valid format' };
    }
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth JWT signing secret',
    example: 'Run: openssl rand -base64 32',
    validation: (value) => {
      if (!value) return { valid: false, message: 'Not set' };
      if (value.length < 32) {
        return { valid: false, message: 'Too short (must be at least 32 characters)' };
      }
      return { valid: true, message: 'Valid length' };
    }
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'Your site URL for OAuth callbacks',
    example: 'https://your-site.netlify.app',
    validation: (value) => {
      if (!value) return { valid: false, message: 'Not set' };
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return { valid: false, message: 'Must start with http:// or https://' };
      }
      if (value.endsWith('/')) {
        return { valid: false, message: 'Should not have trailing slash' };
      }
      return { valid: true, message: 'Valid format' };
    }
  }
];

const optionalVars = [
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API key for AI chat features',
    example: 'sk-...',
  },
  {
    name: 'GITHUB_ID',
    description: 'GitHub OAuth App ID',
    example: 'Iv1.abc123...',
  },
  {
    name: 'GITHUB_SECRET',
    description: 'GitHub OAuth App Secret',
    example: 'abc123...',
  },
  {
    name: 'TAVILY_API_KEY',
    description: 'Tavily API key for web search',
    example: 'tvly-...',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key for payments',
    example: 'sk_test_...',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key',
    example: 'pk_test_...',
  }
];

let allValid = true;
let missingRequired = [];

// Check required variables
console.log(chalk.bold('📋 Required Variables (app will not start without these):\n'));

requiredVars.forEach(({ name, description, example, validation }) => {
  const value = process.env[name];
  const result = validation(value);

  const status = result.valid ? chalk.green('✓') : chalk.red('✗');
  const statusText = result.valid ? chalk.green('OK') : chalk.red('MISSING/INVALID');

  console.log(`${status} ${chalk.bold(name)}`);
  console.log(`  Description: ${description}`);
  console.log(`  Status: ${statusText} - ${result.message}`);

  if (!result.valid) {
    console.log(chalk.yellow(`  Action needed: ${example}`));
    allValid = false;
    missingRequired.push(name);
  } else if (value) {
    // Show masked value for valid variables
    const maskedValue = value.length > 20
      ? value.substring(0, 15) + '...' + value.substring(value.length - 5)
      : value.substring(0, 10) + '...';
    console.log(chalk.green(`  Value: ${maskedValue}`));
  }
  console.log('');
});

// Check optional variables
console.log(chalk.bold('\n📦 Optional Variables (for additional features):\n'));

let hasOptional = false;
optionalVars.forEach(({ name, description, example }) => {
  const value = process.env[name];
  const status = value ? chalk.green('✓') : chalk.yellow('○');
  const statusText = value ? chalk.green('SET') : chalk.yellow('NOT SET');

  console.log(`${status} ${chalk.bold(name)}`);
  console.log(`  Description: ${description}`);
  console.log(`  Status: ${statusText}`);

  if (!value) {
    console.log(chalk.yellow(`  Optional: ${example}`));
  } else {
    hasOptional = true;
    const maskedValue = value.length > 20
      ? value.substring(0, 15) + '...' + value.substring(value.length - 5)
      : value.substring(0, 10) + '...';
    console.log(chalk.green(`  Value: ${maskedValue}`));
  }
  console.log('');
});

// Summary
console.log(chalk.bold('\n' + '='.repeat(60)));
console.log(chalk.bold('📊 Summary\n'));

if (allValid) {
  console.log(chalk.green('✓ All required environment variables are set correctly!'));
  console.log(chalk.green('✓ Your application should deploy successfully.\n'));

  if (!hasOptional) {
    console.log(chalk.yellow('ℹ  Note: No optional variables are set.'));
    console.log(chalk.yellow('   Some features (OpenAI chat, GitHub OAuth) will not be available.\n'));
  }

  process.exit(0);
} else {
  console.log(chalk.red('✗ Missing or invalid required environment variables!'));
  console.log(chalk.red(`  Missing: ${missingRequired.join(', ')}\n`));

  console.log(chalk.bold('🔧 Next Steps:\n'));
  console.log('1. Set the missing environment variables in Netlify:');
  console.log('   Go to Site Settings > Environment Variables\n');
  console.log('2. For detailed setup instructions, see:');
  console.log(chalk.blue('   SETUP_ENVIRONMENT.md\n'));
  console.log('3. After setting variables, trigger a new deploy\n');
  console.log('4. Run this script again to verify\n');

  process.exit(1);
}
