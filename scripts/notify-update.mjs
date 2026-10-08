// Tells every user a new version is out: an Expo push to each saved push
// token (profiles.expo_push_token). Tapping it downloads the APK and opens the
// installer (src/services/appUpdateService.ts). Run it AFTER the GitHub
// Release with the APK is published. Full process: docs/RELEASING.md.
//
//   npm run notify-update                 version from app.json
//   npm run notify-update -- 1.4.3        explicit version
//   npm run notify-update -- --dry-run    count recipients, send nothing
//
// Needs SUPABASE_SERVICE_ROLE_KEY, the secret key (reads every profile's token, past RLS) in
// the environment or in .env.release.local (gitignored). It is a server
// secret: never put it in an EXPO_PUBLIC_* variable or anywhere in the app.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "MATRIX-02/LifeSync";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const fail = (msg) => {
	console.error(`\n✖ ${msg}\n`);
	process.exit(1);
};

function loadEnv(file) {
	const path = resolve(ROOT, file);
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
	}
}
loadEnv(".env.release.local");
loadEnv(".env.local");

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) fail("EXPO_PUBLIC_SUPABASE_URL not set (.env.local).");
if (!SERVICE_KEY) {
	fail(
		"SUPABASE_SERVICE_ROLE_KEY not set. Put it in .env.release.local\n" +
			"  (Supabase → Project Settings → API Keys → Secret keys, sb_secret_...).",
	);
}

// New-style secret keys (sb_secret_...) go in the apikey header only - the
// gateway rejects them as a Bearer token. Legacy service_role keys are JWTs
// and are sent in both.
const authHeaders = {
	apikey: SERVICE_KEY,
	...(SERVICE_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
};

const appJson = JSON.parse(readFileSync(resolve(ROOT, "app.json"), "utf8"));
const version = args.find((a) => !a.startsWith("--")) ?? appJson.expo.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`Not a version: ${version}`);
const apkUrl = `https://github.com/${REPO}/releases/download/v${version}/LifeSync-v${version}.apk`;

// 1. The APK must really be there - otherwise every user taps into a 404.
const head = await fetch(apkUrl, { method: "HEAD", redirect: "follow" });
if (!head.ok) {
	fail(`APK not found (HTTP ${head.status}): ${apkUrl}\n  Publish the GitHub Release first.`);
}

// 2. Every saved push token.
const tokens = new Set();
for (let from = 0; ; from += 1000) {
	const res = await fetch(
		`${SUPABASE_URL}/rest/v1/profiles?select=expo_push_token&expo_push_token=not.is.null`,
		{
			headers: {
				...authHeaders,
				Range: `${from}-${from + 999}`,
			},
		},
	);
	if (!res.ok) fail(`Reading tokens failed: HTTP ${res.status} ${await res.text()}`);
	const rows = await res.json();
	for (const r of rows) if (r.expo_push_token) tokens.add(r.expo_push_token);
	if (rows.length < 1000) break;
}

console.log(`LifeSync ${version} → ${tokens.size} device(s)\n  ${apkUrl}`);
if (dryRun) {
	console.log("\n(dry run - nothing sent)");
	process.exit(0);
}
if (tokens.size === 0) process.exit(0);

// 3. Expo push, 100 messages per request.
const message = (to) => ({
	to,
	title: `LifeSync ${version} is available`,
	body: "Tap to download and install the update.",
	sound: "default",
	priority: "high",
	channelId: "app-updates",
	data: { type: "app_update", version, apkUrl },
});

const list = [...tokens];
let sent = 0;
const dead = [];
const errors = {};
for (let i = 0; i < list.length; i += 100) {
	const batch = list.slice(i, i + 100);
	const res = await fetch("https://exp.host/--/api/v2/push/send", {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify(batch.map(message)),
	});
	if (!res.ok) fail(`Expo push failed: HTTP ${res.status} ${await res.text()}`);
	const { data } = await res.json();
	data.forEach((ticket, j) => {
		if (ticket.status === "ok") return void sent++;
		const code = ticket.details?.error ?? ticket.message ?? "unknown";
		errors[code] = (errors[code] ?? 0) + 1;
		if (code === "DeviceNotRegistered") dead.push(batch[j]);
	});
}

// 4. Uninstalled apps: forget their tokens so the next run is accurate.
for (const token of dead) {
	await fetch(
		`${SUPABASE_URL}/rest/v1/profiles?expo_push_token=eq.${encodeURIComponent(token)}`,
		{
			method: "PATCH",
			headers: {
				...authHeaders,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ expo_push_token: null }),
		},
	);
}

console.log(`\n✔ Sent: ${sent}`);
for (const [code, n] of Object.entries(errors)) console.log(`✖ ${code}: ${n}`);
if (errors.InvalidCredentials) {
	console.log(
		"\nInvalidCredentials = Firebase (FCM) isn't set up for this project yet.\n" +
			"See docs/RELEASING.md → \"Update notifications\".",
	);
}
