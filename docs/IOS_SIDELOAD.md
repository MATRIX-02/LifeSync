# Installing LifeSync on an iPhone (free, from Windows)

No Mac and no paid Apple Developer account. GitHub builds an unsigned `.ipa`; a sideloading tool signs it with a free Apple ID and installs it.

Two ways to install:

- **SideStore (recommended)** - one-time setup with the PC, then the phone re-signs LifeSync itself every week. No PC, no cable.
- **Sideloadly** - simplest setup, but you reinstall by hand from the PC every 7 days.

Use a **separate free Apple ID** for sideloading, not your main one. Both tools need its password, and SideStore talks to a community "anisette" server to sign in to Apple.

## 1. Build the .ipa

1. GitHub → **Actions** → **Build iOS (unsigned)** → **Run workflow** (takes ~20-40 min).
2. Open the finished run, download the **LifeSync-ios** artifact and unzip it to get `LifeSync.ipa`.
3. Copy `LifeSync.ipa` to the iPhone (iCloud Drive, or AirDrop/email to yourself and "Save to Files") for SideStore, or keep it on the PC for Sideloadly.

The repo is public, so macOS runner minutes are free. Artifacts are deleted after 14 days - keep your own copy of the .ipa.

## 2a. Install with SideStore (recommended)

SideStore's tooling changes between releases; follow **docs.sidestore.io** for the exact current steps. Download only from **sidestore.io** and its official GitHub - copies with malware exist. The outline:

**One-time setup (PC + USB cable):**

1. On Windows, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store versions) - they provide the iPhone drivers.
2. Connect the iPhone by USB, unlock it and tap **Trust**.
3. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (restarts the phone).
4. On the PC, use SideStore's recommended installer to install **SideStore** on the phone with your sideloading Apple ID. This also creates a **pairing file** that lets SideStore talk to the phone without the PC.
5. On the iPhone: **Settings → General → VPN & Device Management** → trust your Apple ID.
6. Install the VPN helper app the SideStore docs name from the App Store. It's a local-only VPN: traffic never leaves the phone; it just lets SideStore reach the phone's own signing service.
7. Open SideStore, sign in with the same Apple ID, and import the pairing file if asked.

The pairing file grants full access to your phone. Don't share or upload it.

**Install LifeSync:**

1. Turn on the VPN helper.
2. SideStore → **My Apps** → **+** → pick `LifeSync.ipa` from Files.

**Every week (no PC):** open SideStore with the VPN helper on → **Refresh All**. SideStore also shows how many days are left on each app. Refresh before it hits zero; if it expires, refreshing brings it back with your data intact.

**Installing a newer build:** download the new `LifeSync.ipa` to the phone and install it through **+** again. It installs over the old one and keeps your data.

## 2b. Install with Sideloadly (no SideStore)

1. On Windows, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store versions) - Sideloadly needs their drivers.
2. Install **Sideloadly** (sideloadly.io).
3. Connect the iPhone by USB and tap **Trust** on the phone.
4. Drag `LifeSync.ipa` into Sideloadly, enter your Apple ID, click **Start**.
5. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (restarts the phone), then **Settings → General → VPN & Device Management** → trust your Apple ID.

Every 7 days, repeat step 4 with the same (or a newer) .ipa. Your data is kept.

## Updates

- **Small updates** (`npm run ota`) arrive inside the app: **Settings → App updates**. Nothing to reinstall.
- **New releases** that change native code need a new `.ipa`: build it (step 1) and install it over the old one (2a or 2b).

## Limits of a free Apple ID

- **Apps stop opening after 7 days** unless refreshed (SideStore does this on the phone; Sideloadly needs the PC).
- Max **3 sideloaded apps** at a time - SideStore itself counts as one.
- Remote push notifications (admin announcements) don't work. Local reminders (habits, water, bills, pomodoro, fasting) do.

## Android-only features

Not available on iOS - Apple doesn't allow them: automatic transaction detection (SMS reading and notification listening) and home screen widgets.
