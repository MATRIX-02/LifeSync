# Fixing "Unsupported Provider" Error for Google OAuth

## Problem
You're getting: **"Unsupported provider, provider is not enabled"**

This means Google OAuth isn't properly enabled in Supabase, or the redirect URI doesn't match.

---

## Solution: 3-Step Fix

### Step 1: Enable Google Provider in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list
4. Click on it to expand
5. Toggle **Enable** to ON (it should turn green)
6. Leave **Client ID** and **Client Secret** fields empty for now - we'll configure them next

### Step 2: Get Your Expo Redirect URI

Your Expo Go redirect URI depends on your username. Run this command to find it:

```bash
npx expo-app-auth print-uri
```

Or manually construct it:
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
```

Replace `YOUR_EXPO_USERNAME` with your actual Expo username (from https://expo.dev).

### Step 3: Configure Google OAuth Credentials

#### 3a. In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services** > **Credentials**
3. Find your **Web application** OAuth credentials (the one you created for Expo)
4. Click on it to edit
5. Under **Authorized redirect URIs**, add:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
   ```
6. **Save**

#### 3b. In Supabase Dashboard:

1. Go to **Authentication** > **Providers**
2. Click on **Google** to expand
3. Fill in:
   - **Client ID**: From Google Cloud Console (Web OAuth credentials)
   - **Client Secret**: From Google Cloud Console (Web OAuth credentials)
4. Click **Save**

---

## For Your Setup (Expo Go)

Since you're using **Expo Go** (not a development build), you MUST use the **Web OAuth credentials** from Google Cloud Console, NOT Android/iOS credentials.

### What You Have:
- ✅ Web OAuth Client ID and Secret (for Expo Go)
- ❌ Android/iOS credentials (not needed for Expo Go)

### What You Need to Do:

1. **In Google Cloud Console:**
   - Make sure your Web OAuth app has this redirect URI:
     ```
     https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
     ```

2. **In Supabase:**
   - Enable Google provider
   - Use the Web OAuth Client ID and Secret
   - Do NOT use Android/iOS credentials

---

## Testing the Fix

After making these changes:

1. **Clear the app cache** (press `r` in the Expo terminal to reload)
2. **Test Google Sign In** again
3. You should see the Google login prompt

---

## Troubleshooting

### Error: "Invalid client" or "Redirect URI mismatch"
- Make sure your Expo redirect URI exactly matches what's in Google Cloud Console
- Check for typos or trailing slashes

### Error: "Provider not enabled"
- Make sure Google is toggled ON in Supabase > Authentication > Providers
- Refresh the page and try again

### Error: "This app isn't verified"
- This is a Google warning for test apps - click "Continue" or "Go to app"
- You'll see this until your app is submitted to Google for verification

### Blank screen after clicking Google Sign In
- This usually means the redirect isn't working
- Double-check the redirect URI matches exactly

---

## Why Web OAuth for Expo Go?

Expo Go is a "wrapper" app that runs your code. It uses its own redirect mechanism:
- **Expo Go**: Uses `https://auth.expo.io/` redirects (Web OAuth)
- **Android**: Uses custom schemes like `lifesync://` (Android OAuth)
- **iOS**: Uses deep links (iOS OAuth)

Since Expo Go uses web-based redirects, we need Web OAuth credentials, not Android/iOS credentials.

---

## Production Build (When You're Ready)

When you build for Android/iOS with EAS Build:

1. Create **separate** Android and iOS OAuth credentials
2. Configure those in a separate Supabase provider entry OR use the same provider with multiple credential sets
3. Supabase will automatically use the right credentials based on the redirect URI

---

## Example: Complete Configuration

### Google Cloud Console (Web OAuth)
```
Client ID: 123456789-abcdefghijk.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxx
Redirect URI: https://auth.expo.io/@yourname/lifesync
```

### Supabase Dashboard
```
Provider: Google ✅ (enabled)
Client ID: 123456789-abcdefghijk.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxx
```

### app.json
```json
{
  "expo": {
    "scheme": "lifesync"
  }
}
```

---

## Still Having Issues?

Try these steps:

1. **Clear Supabase cache:**
   - Go to Supabase > Authentication > Providers
   - Toggle Google OFF, save
   - Wait 10 seconds
   - Toggle Google ON, save

2. **Verify credentials:**
   - Copy Client ID/Secret directly from Google Cloud
   - Don't edit them or add spaces

3. **Check Expo connection:**
   - Run `npx expo whoami` to confirm you're logged into Expo
   - The redirect URI uses your Expo username

4. **Review Supabase logs:**
   - Go to Supabase > Authentication > Auth Logs
   - Look for detailed error messages

---

## References

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Auth Session Docs](https://docs.expo.dev/guides/authentication/#google)
- [Google Cloud Console](https://console.cloud.google.com)
