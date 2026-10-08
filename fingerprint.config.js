// The runtime version (app.json "runtimeVersion": fingerprint) is a hash of
// everything native. An OTA update only reaches APKs with the same hash.
// Leave the version numbers out of it: `npm run release` bumps them on every
// release, and they'd otherwise make each OTA update target a runtime that no
// installed APK has. See docs/RELEASING.md → "Over-the-air updates".
/** @type {import('expo/fingerprint').Config} */
module.exports = {
	sourceSkips: ["ExpoConfigVersions"],
};
