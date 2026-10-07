// One-off: finds a YouTube form-demo video for each exercise in
// src/data/exerciseDatabase.ts and emits an id -> video map for review.
//
//   node scripts/fetch-exercise-videos.mjs
//
// For each exercise it searches YouTube, prefers well-known coaching channels
// and short videos, then confirms the pick exists and allows embedding via
// YouTube's oEmbed endpoint (non-embeddable videos return 401 there).
// Re-runs keep the picks already in exerciseVideos.ts (so reviewed choices
// don't drift) and only search for exercises that are missing or listed in
// QUERIES. Pass --refresh to re-search everything.
// Review scripts/exercise-video-report.json afterwards.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = resolve(ROOT, "src/data/exerciseDatabase.ts");
const OUT_PATH = resolve(ROOT, "src/data/exerciseVideos.ts");
const REPORT_PATH = resolve(ROOT, "scripts/exercise-video-report.json");

// Hand-picked videos: exercise id -> YouTube video id. Always wins.
const OVERRIDES = {};

// Custom search terms where the generic query found the wrong thing
// (wrong language, rehab vs. machine variant, opposite movement, ...).
// Listing an id here always re-searches it.
const QUERIES = {
	ex_lateral_raises: "dumbbell lateral raise proper form scott herman",
	ex_leg_extension: "leg extension machine proper form",
	ex_prone_lying: "prone lying exercise low back pain mckenzie",
	ex_walking: "brisk walking proper technique",
	ex_stair_climbing: "stair climbing workout proper form",
	ex_pelvic_tilt: "posterior pelvic tilt exercise lying how to physical therapist",
	ex_side_plank_modified: "modified side plank knees bent how to",
	ex_high_knees: "high knees exercise how to proper form",
	ex_skipping: "skater jumps exercise how to proper form",
	ex_walking_rehab: "walking program for low back pain physical therapist",
	ex_sciatic_nerve_glide_seated: "seated sciatic nerve glide slider",
	ex_sciatic_nerve_glide_supine: "supine sciatic nerve floss lying down",
};

const REFRESH = process.argv.includes("--refresh");

function readPrevious() {
	try {
		const src = readFileSync(OUT_PATH, "utf8");
		const out = {};
		const re = /\/\/ (.*) — (.*)\n\t(ex_\w+): "([\w-]{11})"/g;
		let m;
		while ((m = re.exec(src)) !== null)
			out[m[3]] = { videoId: m[4], title: m[1], channel: m[2] };
		return out;
	} catch {
		return {};
	}
}

// Channels known for accurate form instruction. A match earns a big bonus.
const TRUSTED = [
	"jeremy ethier",
	"jeff nippard",
	"renaissance periodization",
	"scott herman fitness",
	"scottherman",
	"buff dudes",
	"athlean-x",
	"alan thrall",
	"squat university",
	"mind pump",
	"jeffnippard",
	"bodybuilding.com",
	"howcast",
	"muscle & strength",
	"bob & brad",
	"e3 rehab",
	"physiotutors",
	"askdoctorjo",
	"ask doctor jo",
	"precision movement",
	"garage gym reviews",
	"well+good",
	"nourishmovelove",
];

const REHAB_HINT = /stretch|tilt|knee to chest|bird dog|clamshell|dead bug|bridge|mobility|cat cow|extension|nerve|glide/i;

const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readLocalExercises() {
	const src = readFileSync(DB_PATH, "utf8");
	const re = /id:\s*"(ex_[^"]+)"\s*,\s*\n\s*name:\s*"([^"]+)"/g;
	const out = [];
	let m;
	while ((m = re.exec(src)) !== null) out.push({ id: m[1], name: m[2] });
	return out;
}

const toSeconds = (len) =>
	!len
		? null
		: len
				.split(":")
				.map(Number)
				.reduce((acc, n) => acc * 60 + n, 0);

const decode = (s) =>
	s
		.replace(/\\u0026/g, "&")
		.replace(/\\"/g, '"')
		.replace(/\\\//g, "/");

function parseResults(html) {
	const out = [];
	const re = /"videoRenderer":\{"videoId":"([\w-]{11})"/g;
	let m;
	while ((m = re.exec(html)) !== null && out.length < 12) {
		const chunk = html.slice(m.index, m.index + 8000);
		const title = chunk.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
		const owner = chunk.match(/"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
		const length = chunk.match(/"lengthText":\{[^}]*?"simpleText":"([\d:]+)"/);
		out.push({
			videoId: m[1],
			title: title ? decode(title[1]) : "",
			channel: owner ? decode(owner[1]) : "",
			seconds: toSeconds(length?.[1]),
		});
	}
	return out;
}

const significant = (name) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 2 && !["the", "with", "and", "for"].includes(w));

function score(candidate, name, rank) {
	const title = candidate.title.toLowerCase();
	const channel = candidate.channel.toLowerCase();
	const words = significant(name);
	const hits = words.filter((w) => title.includes(w.replace(/s$/, ""))).length;
	let s = (hits / Math.max(1, words.length)) * 40;
	if (TRUSTED.some((t) => channel.includes(t))) s += 35;
	if (/form|how to|technique|tutorial|proper|mistakes/.test(title)) s += 10;
	if (candidate.seconds !== null) {
		if (candidate.seconds >= 25 && candidate.seconds <= 600) s += 10;
		else if (candidate.seconds > 1200) s -= 25;
	}
	if (/#shorts|compilation|workout routine|full workout|podcast/.test(title)) s -= 20;
	s -= rank * 1.5; // YouTube's own ranking still counts for something
	return s;
}

async function oembed(videoId) {
	const res = await fetch(
		`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
	);
	if (!res.ok) return null; // 401 = embedding disabled, 404 = gone
	return res.json();
}

async function findVideo({ id, name }) {
	const query = QUERIES[id] ?? (REHAB_HINT.test(name)
		? `${name} exercise physical therapy how to`
		: `${name} proper form how to`);
	const res = await fetch(
		`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
		{ headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } },
	);
	if (!res.ok) throw new Error(`search ${res.status}`);
	const candidates = parseResults(await res.text())
		.map((c, i) => ({ ...c, score: score(c, name, i) }))
		.sort((a, b) => b.score - a.score);

	for (const c of candidates.slice(0, 4)) {
		const meta = await oembed(c.videoId);
		if (meta) return { ...c, title: meta.title, channel: meta.author_name };
	}
	return null;
}

async function main() {
	const local = readLocalExercises();
	if (local.length === 0) throw new Error(`No exercises parsed from ${DB_PATH}`);
	console.log(`Parsed ${local.length} local exercises.`);

	const results = {};
	const report = [];
	const previous = REFRESH ? {} : readPrevious();
	for (const ex of local) {
		if (previous[ex.id] && !QUERIES[ex.id] && !OVERRIDES[ex.id]) {
			results[ex.id] = previous[ex.id];
			report.push({ ...ex, ...previous[ex.id], source: "kept" });
			continue;
		}
		if (OVERRIDES[ex.id]) {
			const meta = await oembed(OVERRIDES[ex.id]);
			results[ex.id] = {
				videoId: OVERRIDES[ex.id],
				title: meta?.title ?? "",
				channel: meta?.author_name ?? "",
			};
			report.push({ ...ex, ...results[ex.id], source: "override", ok: !!meta });
			continue;
		}
		try {
			const pick = await findVideo(ex);
			if (pick) {
				results[ex.id] = pick;
				report.push({ ...ex, ...pick, source: "search" });
				console.log(`✓ ${ex.name} -> ${pick.channel}: ${pick.title}`);
			} else {
				report.push({ ...ex, source: "none" });
				console.log(`✗ ${ex.name}: no embeddable result`);
			}
		} catch (e) {
			report.push({ ...ex, source: "error", error: String(e) });
			console.log(`! ${ex.name}: ${e}`);
		}
		await sleep(700); // be polite to YouTube
	}

	const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	const lines = Object.entries(results).map(
		([id, v]) =>
			`\t// ${esc(v.title).replace(/\*\//g, "")} — ${esc(v.channel)}\n\t${id}: "${v.videoId}",`,
	);
	writeFileSync(
		OUT_PATH,
		`// AUTO-GENERATED by scripts/fetch-exercise-videos.mjs - do not edit by hand.
// Put hand-picked replacements in OVERRIDES in that script and re-run it.
// Videos are embedded with YouTube's player; they remain the creators' content.

export const EXERCISE_VIDEOS: Record<string, string> = {
${lines.join("\n")}
};

export const getExerciseVideo = (exerciseId: string): string | undefined =>
	EXERCISE_VIDEOS[exerciseId];
`,
	);
	writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
	console.log(
		`\nWrote ${Object.keys(results).length}/${local.length} videos to ${OUT_PATH}`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
