# Supabase Integration Setup Guide

This guide walks you through setting up Supabase authentication, subscriptions, and payment integration for LifeSync.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Install Dependencies](#install-dependencies)
3. [Supabase Project Setup](#supabase-project-setup)
4. [Database Setup](#database-setup)
5. [Google OAuth Setup](#google-oauth-setup)
6. [Environment Configuration](#environment-configuration)
7. [Stripe Integration (Optional)](#stripe-integration-optional)
8. [Testing](#testing)

---

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- A Supabase account (free tier available)
- A Google Cloud Console account (for OAuth)
- (Optional) A Stripe account (for payments)

---

## Install Dependencies

Run the following commands to install required packages:

```bash
# Core Supabase packages
npx expo install @supabase/supabase-js

# Storage for session persistence
npx expo install @react-native-async-storage/async-storage

# For Google OAuth
npx expo install expo-web-browser expo-auth-session expo-crypto

# URL handling for deep links
npx expo install expo-linking
```

---

## Supabase Project Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project details:
   - **Name**: `lifesync` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project to initialize (2-3 minutes)

### Step 2: Get Your API Keys

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Database Setup

### Step 1: Run the Schema SQL

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Click "Run" to execute
5. You should see "Success. No rows returned" for most queries

### Step 2: Verify Tables Created

Go to **Table Editor** and verify these tables exist:
- `profiles`
- `subscription_plans`
- `user_subscriptions`
- `coupons`
- `coupon_redemptions`
- `payments`

### Step 3: Verify Default Plans

Check the `subscription_plans` table has 4 rows:
- Free ($0)
- Basic ($4.99/month)
- Premium ($9.99/month)
- Enterprise ($29.99/month)

---

## Google OAuth Setup

### ⚠️ Important: Expo Go vs Production Builds

- **Expo Go (Testing)**: Use Web OAuth credentials with `https://auth.expo.io/` redirect
- **Android/iOS Builds**: Use Android/iOS OAuth credentials with custom scheme redirects

Since you're using **Expo Go**, follow the **Web OAuth** setup below.

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Google+ API** and **Google Identity** APIs:
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API" and enable it
   - Search for "Google Identity Toolkit API" and enable it

### Step 2: Create OAuth Credentials for Expo Go

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Configure consent screen if prompted:
   - Choose "External"
   - Fill in app name, email, etc.
   - Add scopes: `email`, `profile`, `openid`
4. Create **Web application** credentials:
   - Application type: **Web application**
   - Name: `LifeSync Expo Dev`
   - Authorized redirect URIs:
     ```
     https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
     ```
   - Find your Expo username at https://expo.dev
   - Example: `https://auth.expo.io/@myusername/lifesync`

5. **Copy and save:**
   - Client ID
   - Client Secret

### Step 3: Enable Google in Supabase

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** and click to enable it
3. Toggle **Enable** to ON
4. Enter your Google OAuth credentials:
   - **Client ID** (from Step 2)
   - **Client Secret** (from Step 2)
5. Click **Save**

### Step 4: Configure app.json

Ensure your `app.json` has the scheme configured:

```json
{
  "expo": {
    "scheme": "lifesync"
  }
}
```

### Step 5: Test Google Sign In

1. In the Expo terminal, press `r` to reload
2. Try signing up/signing in with Google
3. You should see Google's login screen

---

### For Production Android/iOS Builds (Later)

When you're ready to build with EAS:

#### Android:
- Create **Android** OAuth credentials in Google Cloud
- Get your SHA-1 fingerprint from EAS
- Add your app's package name and SHA-1 to Google Cloud
- Add the Android credentials to Supabase

#### iOS:
- Create **iOS** OAuth credentials in Google Cloud
- Add your app's Bundle ID to Google Cloud
- Add the iOS credentials to Supabase

**Note**: The same Supabase provider can use different credentials for different platforms based on the redirect URI.

---

### Troubleshooting "Unsupported Provider" Error

If you get this error:
1. Make sure Google is **enabled** in Supabase (toggle is ON)
2. Make sure Client ID and Secret are entered correctly
3. Make sure your redirect URI exactly matches: `https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync`
4. Reload the app (press `r` in Expo terminal)

See [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md) for detailed troubleshooting.

---

## Environment Configuration

### Step 1: Create Environment File

Create a `.env` file in your project root (add to `.gitignore`!):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### Step 2: Update app.json

Add the scheme for deep linking:

```json
{
  "expo": {
    "scheme": "lifesync",
    "ios": {
      "bundleIdentifier": "com.yourcompany.lifesync"
    },
    "android": {
      "package": "com.yourcompany.lifesync",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "lifesync"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Step 3: Load Environment Variables

The app is already configured to use `process.env.EXPO_PUBLIC_*` variables. Expo automatically loads these from `.env` files.

---

## Stripe Integration (Optional)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete verification for your business (or use test mode)
3. Get your API keys from **Developers** > **API keys**

### Step 2: Create Products in Stripe

1. Go to **Products** in Stripe Dashboard
2. Create products matching your plans:
   - Basic Plan (Monthly/Yearly)
   - Premium Plan (Monthly/Yearly)
   - Enterprise Plan (Monthly/Yearly)
3. Copy the Price IDs for each

### Step 3: Webhook Setup (for production)

1. Go to **Developers** > **Webhooks**
2. Add endpoint: `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

### Step 4: Create Supabase Edge Function (Advanced)

For production, you'll want a Supabase Edge Function to handle Stripe webhooks:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize
supabase init

# Create function
supabase functions new stripe-webhook

# Deploy
supabase functions deploy stripe-webhook
```

---

## Testing

### Test Authentication

1. Start the app: `npx expo start`
2. Navigate to login screen
3. Test email/password signup
4. Test Google OAuth (in Expo Go or development build)
5. Verify profile created in Supabase `profiles` table

### Test Subscriptions

1. Log in as a user
2. Navigate to subscription screen
3. Test coupon validation:
   - Create a test coupon in admin panel
   - Apply coupon code
   - Verify discount calculation
4. Test plan selection

### Test Admin Panel

1. In Supabase, update your user's role to 'admin':
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
2. Log out and log back in
3. Access `/admin` routes
4. Test all admin features:
   - Dashboard stats
   - User management
   - Coupon CRUD
   - Plan editing
   - Payment history

---

## Troubleshooting

### "Supabase not configured" message
- Check `.env` file exists with correct values
- Restart Expo development server
- Verify environment variable names start with `EXPO_PUBLIC_`

### Google OAuth not working
- Verify redirect URI matches exactly in Google Console
- Check Supabase Google provider is enabled
- Ensure `expo-auth-session` is properly installed
- Test in development build, not Expo Go for production

### Profile not created after signup
- Check the `handle_new_user` trigger exists in Supabase
- Look for errors in Supabase Logs
- Verify RLS policies are correct

### Subscription not created
- Check `create_default_subscription` trigger exists
- Verify `free` plan exists in `subscription_plans`
- Check Supabase function logs for errors

---

## Free Tier Limits

### Supabase Free Tier
- 500 MB database storage
- 1 GB file storage
- 50,000 monthly active users
- 2 million Edge Function invocations
- Unlimited API requests

### Stripe Pricing
- No monthly fees
- 2.9% + 30¢ per transaction
- Free test mode

---

## Next Steps

1. **Customize Plans**: Edit `subscription_plans` in Supabase to match your pricing
2. **Add Features**: Gate features based on `useAuthStore().subscription?.plan_id`
3. **Implement Stripe**: For real payments, integrate Stripe Payment Intents
4. **Add Analytics**: Track user events with Supabase Analytics or PostHog
5. **Set Up CI/CD**: Use EAS Build for automated deployments

---

## File Structure Reference

```
src/
├── config/
│   └── supabase.ts          # Supabase client initialization
├── types/
│   └── database.ts          # TypeScript types for DB tables
├── context/
│   ├── authStore.ts         # Authentication state (Zustand)
│   ├── subscriptionStore.ts # Subscription management
│   └── adminStore.ts        # Admin panel state
app/
├── auth/
│   ├── _layout.tsx          # Auth stack layout
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Signup screen
│   └── forgot-password.tsx  # Password reset
├── admin/
│   ├── _layout.tsx          # Admin stack layout
│   ├── index.tsx            # Admin dashboard
│   ├── users.tsx            # User management
│   ├── coupons.tsx          # Coupon management
│   ├── plans.tsx            # Plan management
│   └── payments.tsx         # Payment history
└── subscription.tsx         # Subscription plans screen
supabase/
└── schema.sql               # Database schema
```

---

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Review browser/Metro console for errors
3. Verify all environment variables are set
4. Test individual API calls in Supabase API docs

Happy coding! 🚀
