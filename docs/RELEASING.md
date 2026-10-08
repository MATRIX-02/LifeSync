# Releasing LifeSync

Releases are **tag-driven**. Pushing to `main` does nothing on its own; pushing
a tag like `v1.4.0` builds a signed APK on GitHub Actions and publishes it as a
GitHub Release with that version's notes.

```
npm run release -- minor        bump version, write notes, commit + tag (no push)
git push origin main
git push origin v1.4.0          ← starts the build; the release appears in ~15 min
```

Releases live at https://github.com/MATRIX-02/LifeSync/releases.

---

## 1. Version numbers

`app.json` holds two numbers and **both** must change every release:

| Field | Example | Rule |
|---|---|---|
| `expo.version` | `1.4.0` | What users see. [Semantic versioning](https://semver.org): |
| | | **patch** (`1.3.0 → 1.3.1`) - bug fixes only |
| | | **minor** (`1.3.0 → 1.4.0`) - new features, nothing removed |
| | | **major** (`1.3.0 → 2.0.0`) - big redesigns, removed features, data changes needing user action |
| `expo.android.versionCode` | `6` | Integer Android uses to decide what's newer. **Must always increase by at least 1**, or the APK won't install over the previous one. |

The tag is always `v` + `expo.version` (`v1.4.0`). The build refuses to run
if they don't match. (`package.json`'s `version` is unused - ignore it.)

## 2. Cutting a release

1. **Finish on `main`.** Merge your branch into `main` and pull, so your local `main` matches GitHub.
2. **Run the script:**
   ```
   npm run release -- patch | minor | major | 1.4.0
   npm run release -- minor --dry-run      # preview only
   ```
   It refuses to run off `main`, with uncommitted changes, or if the tag
   exists. It then:
   - bumps `expo.version` and `versionCode` in `app.json`
   - creates `docs/releases/v1.4.0.md` from a template, with the commits since the last release in a hidden comment, and **pauses so you can write the notes**
   - commits `chore(release): v1.4.0` and creates the annotated tag `v1.4.0`
   - does **not** push
3. **Review**, then push:
   ```
   git push origin main
   git push origin v1.4.0
   ```
4. **Watch the build** in the Actions tab (or `gh run watch`). When it's green, the release is live with `LifeSync-v1.4.0.apk` attached.

Doing it by hand instead of the script is fine - just change both numbers,
add the notes file, commit, and tag with the same name.

## 3. Release notes

One file per version: `docs/releases/v<version>.md`. It becomes the GitHub
Release text, so write it **for users**:

- Group by module (💰 Money Hub, 🏋️ Workouts, ✅ Habits, 📚 Study), then 🐛 Fixes.
- Say what changed *for them* and why it matters - "Budgets can now be edited", not "add updateBudget to BudgetManager".
- Plain language. No internal names, file paths or jargon.
- Mention anything users must do (reinstall, re-login, permissions).
- Keep the **Install** section at the end.

[`v1.3.0.md`](releases/v1.3.0.md) is a good reference. If the file is
missing, GitHub generates notes from commit messages instead (works, but reads
like a changelog for developers).

## 4. What the build does

[`.github/workflows/release-apk.yml`](../.github/workflows/release-apk.yml),
triggered by a `v*` tag push or **Actions → Release APK → Run workflow**:

1. Fails fast if any secret is missing, or the tag ≠ `app.json` version.
2. `npm ci`, writes `.env.local` from secrets, restores the signing keystore.
3. `expo prebuild` + `gradlew assembleRelease`.
4. Verifies the APK is **not** debug-signed (a debug-signed APK can't be installed over existing installs).
5. Publishes the release with the notes file and `LifeSync-vX.Y.Z.apk`.

**Testing the build without releasing:** Actions → Release APK → Run workflow,
tick **Dry run**. It does the full signed build but publishes nothing; the APK
is attached to the run as an artifact for 7 days. CLI:
`gh workflow run release-apk.yml -f dry_run=true`.

### Repository secrets

Settings → Secrets and variables → Actions. Already configured; only needed again if the key or values change.

| Secret | Source |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 ~/.android-keystores/lifesync-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | `LIFESYNC_UPLOAD_STORE_PASSWORD` in `~/.gradle/gradle.properties` |
| `ANDROID_KEY_ALIAS` | `LIFESYNC_UPLOAD_KEY_ALIAS` (`lifesync-release`) |
| `ANDROID_KEY_PASSWORD` | `LIFESYNC_UPLOAD_KEY_PASSWORD` |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `EXPO_PUBLIC_GROQ_API_KEY` | `.env.local` |

> **Never lose the keystore.** Every LifeSync APK must be signed with
> `lifesync-release.jks`. Android refuses to update an app signed with a
> different key, so a lost key means every user must uninstall (losing local
> data) to get new versions. Keep a backup outside this machine.

Anything named `EXPO_PUBLIC_*` is embedded in the APK and readable by anyone
who downloads it. Never put a server secret (e.g. a payment provider's secret
key) in one.

## 5. Publishing without GitHub Actions

If Actions can't run (e.g. an account billing lock - *"The job was not started
because your account is locked due to a billing issue"*), tag and push as
normal, then build and upload locally. Needs the keystore and
`~/.gradle/gradle.properties` on this machine, plus the
[GitHub CLI](https://cli.github.com) logged in (`gh auth login`).

```bash
# Build (≈2 min incremental, longer from clean)
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease && cd ..

# Verify: must show CN=LifeSync, NOT "CN=Android Debug", and the new versionName
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
aapt2 dump badging android/app/build/outputs/apk/release/app-release.apk | head -1

# Publish
cp android/app/build/outputs/apk/release/app-release.apk LifeSync-v1.4.0.apk
gh release create v1.4.0 LifeSync-v1.4.0.apk \
  --title "LifeSync v1.4.0" --notes-file docs/releases/v1.4.0.md --latest --verify-tag
```

`apksigner` and `aapt2` are in `$ANDROID_HOME/build-tools/<version>/`.
Don't re-run the failed Actions job afterwards - the release already exists.

## 6. Update notifications

After the GitHub Release with the APK is live, tell every user:

```
npm run notify-update -- --dry-run     how many devices would get it
npm run notify-update                  send (version from app.json)
```

Each signed-in user gets "LifeSync X.Y.Z is available". Tapping it downloads
`LifeSync-vX.Y.Z.apk` from the release and opens Android's installer - the
user confirms with one tap (Android never allows a silent install for apps
outside the Play Store). Users already on that version are told they're up to
date. The script refuses to send if the APK isn't on the release yet.

Only apps from 1.4.3 onwards can act on the notification; older installs need
this one update by hand.

### One-time setup

1. **Firebase (Android push delivery).** Expo's push service delivers through
   Firebase Cloud Messaging; without it every send fails with
   `InvalidCredentials`.
   - [console.firebase.google.com](https://console.firebase.google.com) → add
     project → add an **Android app** with package
     `com.matrix122001.HabitTrackerApp` → download `google-services.json` to
     the repo root.
   - In `app.json`, under `expo.android`, add
     `"googleServicesFile": "./google-services.json"`. Commit the file - it
     holds only public identifiers, and the CI build needs it.
   - Firebase → Project settings → Service accounts → **Generate new private
     key**. Upload that JSON with `eas credentials` → Android → production →
     Google Service Account → *FCM V1*. Do **not** commit this one.
   - Rebuild and reinstall. Push tokens are saved on sign-in.
2. **Service-role key** for the script, in `.env.release.local` (gitignored):
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
   Supabase → Project Settings → API Keys → **Secret keys** (`sb_secret_...`;
   on older projects, Legacy API Keys → `service_role`). It bypasses RLS - it
   must never go in an `EXPO_PUBLIC_*` variable.

## 7. Over-the-air updates (JavaScript-only changes)

Most releases only change JavaScript - screens, parsing, fixes. Those don't
need a new APK: `expo-updates` (built into the app) downloads them on launch
and switches to them on the **next** launch. Nothing to install, no prompt.

```
npm run ota -- --message "Fix detected-payment scrolling"
```

That publishes the current code to the `production` channel. Each installed
APK checks on launch; users get it after their next restart.

**When an OTA isn't enough.** An update only reaches APKs with the same
*runtime version*, a fingerprint of everything native (`app.json`
`runtimeVersion: { policy: "fingerprint" }`; version numbers are excluded in
`fingerprint.config.js`). Adding or upgrading a native package, a config
plugin, permissions or other native `app.json` settings changes the
fingerprint - then the OTA reaches nobody, and you need a normal APK release
(sections 2-6). Check before publishing:

```
npx expo-updates fingerprint:generate --platform android   # compare with the last APK's
```

or simply: if `package.json`'s dependencies, `plugins/` or `app.json`'s
native sections changed since the last APK, do an APK release.

**Rules**
- Bumping `expo.version` for an OTA is fine (it's excluded from the
  fingerprint) and makes Preferences show the new number.
- A bad OTA: `eas update:rollback` or publish a fixed one. Users get it on the
  next launch.
- Only APKs from 1.4.3 onwards include `expo-updates`.

## 8. When something goes wrong

| Problem | Fix |
|---|---|
| Build fails on *"app.json version is X but the tag is Y"* | Delete the tag (`git tag -d vY && git push origin :refs/tags/vY`), fix `app.json`, re-tag. |
| Build fails on missing secrets | Add them (section 4), then re-run the workflow. |
| Bad release already published | Don't reuse the version. Fix, then release the next patch (`1.4.1`). Optionally mark the bad one as a pre-release on GitHub. |
| "App not installed" on a phone | The APK was signed with a different key, or `versionCode` didn't increase. Check with `apksigner` / `aapt2` above. |
| Database changes in a release | Run the SQL in `supabase/migrations/` in the Supabase SQL editor **before** publishing - nothing applies migrations automatically (see `CLAUDE.md`). |
