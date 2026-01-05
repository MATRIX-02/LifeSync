# Google OAuth Setup Checklist for Expo Go

## Quick Fix Checklist

Follow these steps in order:

### Step 1: Find Your Expo Redirect URI ⬜
- [ ] Go to https://expo.dev and note your username
- [ ] Your redirect URI is: `https://auth.expo.io/@YOUR_USERNAME/lifesync`
- [ ] Example: `https://auth.expo.io/@myname/lifesync`

### Step 2: Configure Google Cloud Console ⬜
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Find your **Web OAuth 2.0 Client** (application type: Web application)
- [ ] Add this redirect URI under "Authorized redirect URIs":
  ```
  https://auth.expo.io/@YOUR_USERNAME/lifesync
  ```
- [ ] Copy your **Client ID**
- [ ] Copy your **Client Secret**

### Step 3: Enable Google in Supabase ⬜
- [ ] Go to your Supabase project dashboard
- [ ] Click **Authentication** > **Providers**
- [ ] Find **Google** and click to expand
- [ ] Toggle **Enable** to ON
- [ ] Paste **Client ID** into the Client ID field
- [ ] Paste **Client Secret** into the Client Secret field
- [ ] Click **Save**

### Step 4: Reload Your App ⬜
- [ ] In the Expo terminal, press `r` to reload the app
- [ ] Wait for Metro bundler to finish reloading
- [ ] Try signing in with Google again

### Step 5: Verify It Works ⬜
- [ ] Click "Sign up with Google"
- [ ] You should see Google's login screen
- [ ] Complete the login
- [ ] You should be redirected back to the app

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| "Unsupported provider" | Google not enabled in Supabase (Step 3) |
| "Redirect URI mismatch" | URI doesn't match Google Console (Step 2) |
| "Invalid client" | Wrong Client ID or Secret (Step 2) |
| Blank screen after clicking Google | Reload the app (Step 4) |
| "This app isn't verified" | Click "Continue anyway" (it's just a warning) |

---

## Expo Username Lookup

Not sure of your Expo username? Run:
```bash
npx expo whoami
```

If you're not logged in, run:
```bash
npx expo login
```

---

## For Android/iOS Builds Later

When you're ready to make a development build or production build:

1. Create **separate** Android/iOS OAuth credentials in Google Cloud
2. Add their redirect URIs to Google Cloud Console
3. Configure them in Supabase (same provider, multiple credentials sets)

For now, **just use the Web OAuth credentials** for Expo Go testing.

---

## Need Help?

Check the detailed troubleshooting guide: [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md)
