// Prepares a release: bumps the version, writes the release-notes file,
// commits and tags. It does NOT push - review first, then push (see the
// printed next steps). Full process: docs/RELEASING.md.
//
//   npm run release -- patch          1.3.0 -> 1.3.1
//   npm run release -- minor          1.3.0 -> 1.4.0
//   npm run release -- major          1.3.0 -> 2.0.0
//   npm run release -- 1.4.0          explicit version
//   npm run release -- minor --dry-run   show what would happen, change nothing
//
// Refuses to run on a dirty tree, off `main`, or if the tag already exists.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JSON = resolve(ROOT, "app.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bump = args.find((a) => !a.startsWith("--"));

const sh = (cmd) =>
	execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const fail = (msg) => {
	console.error(`\n✖ ${msg}\n`);
	process.exit(1);
};

if (!bump) fail("Usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run]");

// ---- preconditions ----
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch !== "main" && !dryRun)
	fail(`Releases are cut from main (you're on "${branch}"). Merge first, then run this on main.`);

// Untracked files are fine (they aren't part of the release); modified or
// staged tracked files are not, because they would be left out of the tag.
const dirty = sh("git status --porcelain --untracked-files=no");
if (dirty && !dryRun) fail(`Commit or stash your changes first:\n${dirty}`);

// ---- versions ----
const appJsonText = readFileSync(APP_JSON, "utf8");
const app = JSON.parse(appJsonText);
const current = app.expo.version;
const currentCode = app.expo.android?.versionCode;
if (!/^\d+\.\d+\.\d+$/.test(current)) fail(`app.json version "${current}" is not x.y.z`);
if (!Number.isInteger(currentCode)) fail("app.json has no expo.android.versionCode");

const [maj, min, pat] = current.split(".").map(Number);
const next =
	bump === "major"
		? `${maj + 1}.0.0`
		: bump === "minor"
			? `${maj}.${min + 1}.0`
			: bump === "patch"
				? `${maj}.${min}.${pat + 1}`
				: bump;
if (!/^\d+\.\d+\.\d+$/.test(next)) fail(`"${bump}" is not patch, minor, major or x.y.z`);

const newer = (a, b) => {
	const [x, y] = [a, b].map((v) => v.split(".").map(Number));
	for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
	return false;
};
if (!newer(next, current)) fail(`${next} is not newer than the current ${current}`);

const tag = `v${next}`;
const nextCode = currentCode + 1;
if (sh(`git tag --list ${tag}`)) fail(`Tag ${tag} already exists`);

// ---- release notes ----
const lastTag = (() => {
	try {
		return sh("git describe --tags --abbrev=0 --match v*");
	} catch {
		return null;
	}
})();
const commits = sh(
	`git log ${lastTag ? `${lastTag}..HEAD` : ""} --no-merges --pretty=format:"- %s"`,
)
	.split("\n")
	.filter((l) => l && !/^- (docs|chore|ci|style)(\(.+\))?:/.test(l))
	.join("\n");

const notesPath = resolve(ROOT, `docs/releases/${tag}.md`);
const notesExisted = existsSync(notesPath);
const template = `## LifeSync ${next}

<!-- Write for users, not developers: what changed for them and why it
     matters. Group by module. Delete sections you don't need. The raw
     commit list at the bottom is a starting point - rewrite, then delete it. -->

### 💰 Money Hub
-

### 🏋️ Workouts
-

### ✅ Habits
-

### 📚 Study
-

### 🐛 Fixes
-

### Install

Download **\`LifeSync-${tag}.apk\`** below and open it on your Android phone. It installs over earlier versions and keeps your data.

<!-- Commits since ${lastTag ?? "the beginning"} (delete before publishing):
${commits || "- (none)"}
-->
`;

console.log(`\nRelease ${current} (code ${currentCode}) → ${next} (code ${nextCode})`);
console.log(`Tag:   ${tag}`);
console.log(`Notes: docs/releases/${tag}.md ${notesExisted ? "(exists, kept)" : "(created from template)"}`);
if (dryRun) {
	console.log("\n--dry-run: nothing changed.\n");
	process.exit(0);
}

// ---- write ----
// Targeted replacements keep app.json's tab formatting and key order intact.
const updated = appJsonText
	.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`)
	.replace(/("versionCode"\s*:\s*)\d+/, `$1${nextCode}`);
const check = JSON.parse(updated).expo;
if (check.version !== next || check.android.versionCode !== nextCode)
	fail("Could not update app.json safely - edit it by hand");
writeFileSync(APP_JSON, updated);
if (!notesExisted) writeFileSync(notesPath, template);

if (!notesExisted) {
	console.log(`\n✎ Edit docs/releases/${tag}.md now, then press Enter to commit and tag (Ctrl+C to abort).`);
	execSync(process.platform === "win32" ? "pause >nul" : "read _", {
		stdio: "inherit",
		shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
	});
	if (readFileSync(notesPath, "utf8").includes("<!-- Commits since"))
		console.log("⚠ The commit list comment is still in the notes. It won't show on GitHub, but consider removing it.");
}

sh(`git add app.json docs/releases/${tag}.md`);
sh(`git commit -m "chore(release): ${tag}"`);
sh(`git tag -a ${tag} -m "LifeSync ${next}"`);

console.log(`
✔ Committed and tagged ${tag} (not pushed).

Next:
  git push origin main
  git push origin ${tag}        ← starts the GitHub build + release

If GitHub Actions can't run, build and publish locally instead:
  see "Publishing without GitHub Actions" in docs/RELEASING.md
`);
