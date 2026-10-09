# Installing LifeSync on an iPhone (free, from Windows)

No Mac and no paid Apple Developer account. GitHub builds an unsigned `.ipa`; Sideloadly signs it with your free Apple ID and installs it.

## 1. Build the .ipa

1. GitHub → **Actions** → **Build iOS (unsigned)** → **Run workflow** (takes ~20-40 min).
2. Open the finished run, download the **LifeSync-ios** artifact and unzip it to get `LifeSync.ipa`.

The repo is public, so macOS runner minutes are free.

## 2. Install with Sideloadly

1. On Windows, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store versions) - Sideloadly needs their drivers.
2. Install **Sideloadly** (sideloadly.io).
3. Connect the iPhone by USB and tap **Trust** on the phone.
4. Drag `LifeSync.ipa` into Sideloadly, enter your Apple ID, click **Start**.
5. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (restarts the phone), then **Settings → General → VPN & Device Management** → trust your Apple ID.

Tip: use a secondary Apple ID if you'd rather not type your main one into a third-party tool.

## Limits of a free Apple ID

- **The app stops opening after 7 days.** Re-run step 2 with the same .ipa; your data is kept (it's in Supabase, and re-installing over the app keeps local storage). AltStore (altstore.io) can instead refresh it automatically over Wi-Fi while AltServer runs on your PC.
- Max 3 sideloaded apps at a time.
- Remote push notifications (admin announcements) don't work. Local reminders (habits, water, bills, pomodoro, fasting) do.

## Android-only features

Not available on iOS - Apple doesn't allow them: automatic transaction detection (SMS reading and notification listening) and home screen widgets.
