# Building a signed release APK locally

A complete runbook for producing the same production APK again, without EAS and
without an internet build service. Hand this file to Claude Code and say "build
the APK following docs/BUILD_APK.md" and it has everything it needs.

Last verified: 29 Aug 2026, producing `lifesync-1.1.0-release.apk` (92.4 MB).

---

## 1. What "production APK" means here

`./gradlew assembleRelease` produces exactly what `eas build --profile
production` would: JS compiled into the APK (`assets/index.android.bundle`),
Hermes bytecode, minified, ProGuard applied, signed with the release key.
There is no separate "production" step beyond this — the `production` profile in
`eas.json` only sets `buildType: apk`, which this already is.

The APK runs standalone. No Metro server, no dev client.

---

## 2. Prerequisites

| Requirement | Verified with | Known-good value |
|---|---|---|
| JDK | `java -version` | 21.0.12 LTS |
| Android SDK | `echo $ANDROID_HOME` | `C:\Users\mayan\AppData\Local\Android\Sdk` |
| Node | `node -v` | v24 |
| Native project | `ls android` | present (generated; gitignored) |

`android/` is prebuild output. If it is missing, or if `app.json` / anything in
`plugins/` changed, regenerate it first:

```bash
npx expo prebuild --platform android --no-install
```

This is safe to re-run — it merges rather than wiping. Use `--clean` only if you
mean to discard the native folder entirely (see the keystore warning below).

---

## 3. Signing

### Where the key lives — deliberately outside the repo

```
Keystore:  ~/.android-keystores/lifesync-release.jks
Alias:     lifesync-release
Passwords: ~/.gradle/gradle.properties   (LIFESYNC_UPLOAD_* properties)
Validity:  10000 days from 29 Aug 2026
```

**Not** inside `android/`, because that folder is generated and
`expo prebuild --clean` would delete the keystore with it.

`~/.gradle/gradle.properties` must contain these four lines:

```properties
LIFESYNC_UPLOAD_STORE_FILE=C:/Users/mayan/.android-keystores/lifesync-release.jks
LIFESYNC_UPLOAD_KEY_ALIAS=lifesync-release
LIFESYNC_UPLOAD_STORE_PASSWORD=<secret>
LIFESYNC_UPLOAD_KEY_PASSWORD=<secret>
```

Use forward slashes in the path even on Windows — this is a Java properties file.

### How it is wired in

`plugins/withReleaseSigning.js`, registered in `app.json`. Expo's template points
the `release` build type at the **debug** keystore (a key that ships with the
Android SDK, is identical on every machine, and has the public password
`android`). The plugin replaces that with:

```gradle
signingConfig project.hasProperty('LIFESYNC_UPLOAD_STORE_FILE')
    ? signingConfigs.release
    : signingConfigs.debug
```

It is a config plugin rather than a hand edit to `android/app/build.gradle`,
because that file is regenerated on every prebuild.

**The fallback is intentional and is a trap to be aware of.** On a machine
without the `LIFESYNC_*` properties the build still succeeds — silently
debug-signed. Always run the verification in step 6.

### 🔴 Back up the keystore

If `lifesync-release.jks` or its password is lost, this app can never be
updated on Google Play under the same identity. There is no recovery. Keep a
copy of the `.jks` **and** the four properties somewhere off this machine.

Current release certificate — anything else means the signing did not apply:

```
DN:      CN=LifeSync, OU=LifeSync, O=LifeSync, L=Unknown, ST=Unknown, C=IN
SHA-256: 41496629abec9f6531e386a495a06644b815ef7dbe79a33f038ceed5598203d7
SHA-1:   afeb1a7716b37636440bde733dba57f56af09ed2
```

(The SHA-1 is what Google Sign-In's native Android client ID would need.)

### Recreating the keystore from scratch

Only if it is genuinely lost — this produces a **different identity**, so any
previously distributed build can no longer be upgraded.

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/.android-keystores/lifesync-release.jks \
  -alias lifesync-release -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=LifeSync, OU=LifeSync, O=LifeSync, L=Unknown, ST=Unknown, C=IN"
```

Then write the four properties into `~/.gradle/gradle.properties`.

---

## 4. Bump the version

`app.json` → `expo.version` (user-visible) and `expo.android.versionCode`
(integer Android compares for updates).

**Android refuses to install an update whose `versionCode` is not greater than
the installed one, and Play rejects a duplicate.** As of the last build this was
still `1` and has never been bumped — increment it for any build you intend to
distribute or install over an existing one.

Run `npx expo prebuild --platform android --no-install` after changing either,
so the native project picks it up.

---

## 5. Build

```bash
cd android
./gradlew assembleRelease --console=plain
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

Roughly 30 s warm, several minutes cold. Add `--no-daemon` in CI. If the build
misbehaves after native or dependency changes, `./gradlew clean` first.

Copy it out with a versioned name so the next build does not overwrite it:

```bash
mkdir -p builds
cp android/app/build/outputs/apk/release/app-release.apk \
   "builds/lifesync-$(node -p "require('./app.json').expo.version")-release.apk"
```

`builds/` is gitignored — a 92 MB binary does not belong in the repository.

---

## 6. Verify the signature — do not skip

Because unsigned-config builds silently fall back to the debug key:

```bash
"$ANDROID_HOME"/build-tools/36.0.0/apksigner.bat verify --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
```

Must print `CN=LifeSync` and SHA-256 `41496629abec…`.

If it prints `CN=Android Debug` / `fac61745dc09…`, the `LIFESYNC_*` properties
were not found. That is the SDK's shared debug certificate — Play rejects it,
and it cannot be upgraded by a properly signed build.

Confirm the JS bundle really is embedded:

```bash
unzip -l android/app/build/outputs/apk/release/app-release.apk | grep index.android.bundle
```

---

## 7. Install

```bash
adb devices -l                                   # confirm a target
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

```
Existing package com.matrix122001.HabitTrackerApp signatures do not match
```

The installed build was signed with a different key — typically the old
debug-signed one. Android will not replace it.

`adb uninstall com.matrix122001.HabitTrackerApp` fixes it, **but wipes the app's
local data**: the AsyncStorage blobs (`workout-storage`, `finance-storage`) that
`migrateLocalWorkoutToCloud` / `migrateLocalFinanceToCloud` read, plus anything
queued in the offline write queue, plus the auth session.

If that data has not yet reached Supabase, migrate before switching keys:

1. Temporarily rename the `LIFESYNC_UPLOAD_STORE_FILE` property so the build
   falls back to debug signing.
2. Build and `adb install -r` — signatures now match, so it installs over the
   top and keeps the data.
3. Launch and sign in. The migrations run on first fetch and push the blobs up.
4. Restore the property, rebuild, then uninstall and install the signed APK.

Once everything is in Supabase, an uninstall costs nothing but a re-login.

### Reading a debuggable build's local storage

Only works for debug builds (`run-as` refuses release builds):

```bash
adb shell run-as com.matrix122001.HabitTrackerApp \
  sqlite3 databases/RKStorage "select key from catalystLocalStorage;"
```

---

## 8. Smoke test after installing

Nothing in a release build has been exercised by `tsc`. Check, in order:

1. Sign in → does FitZone show workout history? (database-first store + migration)
2. Create a habit **immediately** on launch, before the sync spinner settles —
   this used to fail with "No user ID - cannot add habit".
3. Airplane mode → add a transaction → amber "waiting for a connection" banner →
   reconnect → confirm it reaches Supabase.
4. A `times_per_day` habit with a large target, e.g. 24 — the day cell must read
   `1/24` on one line.
5. Settings → Developer → Test Alarm.

---

## 9. Notes and gotchas

- **Secrets in the bundle.** `EXPO_PUBLIC_*` values from `.env.local` are
  inlined into `index.android.bundle` at build time — the Supabase URL and anon
  key ship inside the APK. That is expected for this app: the anon key is
  public-by-design and RLS is the real boundary. Never put a service-role key in
  an `EXPO_PUBLIC_*` variable.
- **Size.** ~92 MB because the APK carries native libs for all four ABIs.
  Enabling ABI splits or an AAB would cut this substantially; not configured.
- **Gradle warnings** about deprecated features / Gradle 9 come from Expo and RN
  plugins, not from this project.
- **Do not commit** `android/`, `builds/`, `*.jks`, or `.env*.local` — all are
  already in `.gitignore`.
