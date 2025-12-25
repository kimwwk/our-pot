#!/bin/bash
# Build Android APK with production environment

set -e  # Exit on error

echo "🏗️  Building Android APK for Production..."
echo ""

# Step 1: Temporarily disable .env.local
if [ -f ".env.local" ]; then
    echo "📦 Backing up .env.local..."
    mv .env.local .env.local.backup
fi

# Step 2: Build Next.js app with production env
echo "⚛️  Building Next.js app (using .env.production)..."
npm run build

# Step 3: Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync

# Step 4: Build Android APK
echo "🤖 Building Android debug APK..."
cd android
./gradlew assembleDebug
cd ..

# Step 5: Restore .env.local
if [ -f ".env.local.backup" ]; then
    echo "♻️  Restoring .env.local..."
    mv .env.local.backup .env.local
fi

echo ""
echo "✅ Build complete!"
echo "📦 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
