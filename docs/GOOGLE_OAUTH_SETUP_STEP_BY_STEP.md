# Step-by-Step: Google OAuth Setup for LifeSync Expo Go

## What You Need
- Google account
- Expo account (https://expo.dev)
- Your Supabase project URL and credentials

---

## Part 1: Find Your Expo Redirect URI

### Step 1.1: Get Your Expo Username
```bash
# In terminal, run:
npx expo whoami

# You'll see output like:
# username: myusername
```

If you're not logged in, run:
```bash
npx expo login
# Then enter your Expo email and password
```

### Step 1.2: Note Your Redirect URI
Your redirect URI is:
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
```

**Example:**
```
https://auth.expo.io/@john_doe/lifesync
```

**📝 Write this down - you'll need it in the next steps!**

---

## Part 2: Set Up Google Cloud Console

### Step 2.1: Go to Google Cloud Console
1. Open https://console.cloud.google.com
2. Click on the project dropdown at the top
3. Click **NEW PROJECT**
4. Name it: `LifeSync`
5. Click **CREATE**

### Step 2.2: Enable Google APIs
1. Click the **Menu icon** (☰) on the top left
2. Go to **APIs & Services** > **Library**
3. Search for **"Google+ API"**
4. Click it and press **ENABLE**
5. Go back to **Library** (click the back button)
6. Search for **"Google Identity Toolkit API"**
7. Click it and press **ENABLE**

### Step 2.3: Create OAuth Credentials
1. Click the **Menu icon** (☰) on the top left
2. Go to **APIs & Services** > **Credentials**
3. Click the blue **+ CREATE CREDENTIALS** button
4. Select **OAuth client ID**

### Step 2.4: Configure OAuth Consent Screen
If you see "OAuth consent screen not configured":
1. Click **CONFIGURE CONSENT SCREEN**
2. Choose **External** as user type
3. Click **CREATE**
4. Fill in the form:
   - App name: `LifeSync`
   - User support email: your-email@gmail.com
   - Developer email: your-email@gmail.com
5. Click **SAVE AND CONTINUE**
6. Click **SAVE AND CONTINUE** for scopes (no changes needed)
7. Click **SAVE AND CONTINUE** for test users
8. Click **BACK TO DASHBOARD**

### Step 2.5: Create Web OAuth Credentials
1. Go to **Credentials** (click on **APIs & Services** > **Credentials** in menu)
2. Click **+ CREATE CREDENTIALS**
3. Select **OAuth client ID**
4. Choose **Web application**
5. Name: `LifeSync Web - Expo Go`
6. Under **Authorized redirect URIs**, click **ADD URI**
7. Paste your redirect URI from Part 1:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync
   ```
   (Replace YOUR_EXPO_USERNAME with your actual username)
8. Click **CREATE**

### Step 2.6: Copy Your Credentials
After clicking CREATE, you'll see a popup:
1. Copy the **Client ID** somewhere safe (notepad)
2. Copy the **Client Secret** somewhere safe (notepad)
3. Click **OK**

**Example:**
```
Client ID: 123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
Client Secret: GOCSPX-ABC123XYZ_SecretValue
```

---

## Part 3: Configure Supabase

### Step 3.1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Click on your LifeSync project

### Step 3.2: Navigate to Authentication Providers
1. On the left sidebar, click **Authentication**
2. Click **Providers**
3. Look for **Google** in the list

### Step 3.3: Enable and Configure Google
1. Click on **Google** to expand it
2. Toggle the switch to **ON** (it should turn green)
3. Paste your **Client ID** from Part 2 into the "Client ID" field
4. Paste your **Client Secret** from Part 2 into the "Client Secret" field
5. Click **SAVE**

Wait 10 seconds for the changes to save.

---

## Part 4: Test Google Sign In

### Step 4.1: Reload Your App
In the Expo terminal (where you ran `npm start`):
1. Press `r` to reload the app
2. Wait for Metro bundler to finish reloading
3. Wait 5 seconds

### Step 4.2: Test Sign Up with Google
1. On the app screen, find the **"Sign up with Google"** button
2. Tap it
3. You should see Google's login screen

### Step 4.3: Complete Google Login
1. Enter your Google email
2. Enter your Google password
3. When asked "LifeSync wants your..." click **CONTINUE**
4. You should be redirected back to the app

### Step 4.4: Check Success
✅ If you see:
- App loads with your name at the top
- You're logged in
- Free plan is active
- No error message

**Congratulations! Google OAuth is working!** 🎉

---

## If Something Goes Wrong

### Error: "Unsupported provider, provider is not enabled"
- Go back to Part 3
- Make sure Google toggle is ON (green)
- Make sure Client ID and Secret are filled in
- Wait 10 seconds
- Reload the app (press `r` in terminal)

### Error: "redirect_uri_mismatch"
- Your redirect URI doesn't match
- Go to Google Cloud Console
- Check the URI exactly matches: `https://auth.expo.io/@YOUR_EXPO_USERNAME/lifesync`
- Make sure YOUR_EXPO_USERNAME is replaced with your actual username
- No typos, no extra spaces

### Error: "Invalid client"
- Your Client ID or Secret is wrong
- Go back to Part 2, Step 2.6
- Copy the credentials again very carefully
- Paste into Supabase (no extra spaces)
- Save and reload

### "This app isn't verified" warning
- This is normal for test apps
- Click **"Go to LifeSync"** or **"Continue anyway"**
- This warning goes away once you submit your app to Google for verification

---

## What's Next?

Now that Google OAuth is working:
1. ✅ Create accounts with Google
2. ✅ Test the Free plan
3. ✅ Try the paid plans (they'll ask for Razorpay/PhonePe payment)
4. ✅ Test the dashboard, habits, workouts, etc.

When you're ready to publish:
- Create Android/iOS OAuth credentials
- Build with EAS
- Submit to Google Play / App Store

---

## Quick Reference

| Item | Value |
|------|-------|
| Expo Redirect URI | `https://auth.expo.io/@YOUR_USERNAME/lifesync` |
| Google Project | LifeSync |
| OAuth Type | Web application |
| Scopes | email, profile, openid |
| Platform | Expo Go (development) |

---

## Support

For detailed troubleshooting: [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md)

For general Supabase setup: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
