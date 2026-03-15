#!/bin/bash

# Safe Environment Setup Script
# This script helps you set up environment variables without exposing them

echo "🔐 Safe Environment Variable Setup"
echo "=================================="
echo ""
echo "⚠️  IMPORTANT: Never share your API keys publicly!"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✓ .env.local already exists"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Keeping existing .env.local"
        exit 0
    fi
fi

echo "Creating .env.local from .env.example..."
cp .env.example .env.local

echo ""
echo "📝 Now edit .env.local with your actual values:"
echo ""
echo "Required for local development:"
echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo "  - DATABASE_URL (use: file:./dev.db for local)"
echo ""
echo "Optional for features:"
echo "  - OPENAI_API_KEY"
echo "  - GITHUB_ID and GITHUB_SECRET (for OAuth)"
echo ""
echo "✅ .env.local created!"
echo ""
echo "To edit: nano .env.local or code .env.local"
echo "To check: npm run check-env"
echo ""
echo "🔒 Remember: .env.local is gitignored and won't be committed"
