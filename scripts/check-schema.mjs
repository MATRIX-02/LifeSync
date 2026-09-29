// Reports which columns must appear in every insert (NOT NULL, no default).
//
// PostgREST serves an OpenAPI description of the exposed schema at the API
// root, but Supabase now restricts that endpoint to secret keys. Pass one in
// the environment so it is never written to disk:
//
//   $env:SUPABASE_SECRET_KEY="sb_secret_..."; node scripts/check-schema.mjs
//
// Without a secret key, run scripts/schema-audit.sql in the dashboard instead.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = resolve(ROOT, "scripts/schema-snapshot.json");

function readEnv() {
	const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
	const env = {};
	for (const line of raw.split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (m) env[m[1]] = m[2];
	}
	return env;
}

async function main() {
	const env = readEnv();
	const url = env.EXPO_PUBLIC_SUPABASE_URL;
	if (!url) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL in .env.local");

	const key = process.env.SUPABASE_SECRET_KEY;
	if (!key) {
		throw new Error(
			"SUPABASE_SECRET_KEY is not set.\n" +
				"Get it from Supabase dashboard > Settings > API Keys, then:\n" +
				'  $env:SUPABASE_SECRET_KEY="sb_secret_..."; node scripts/check-schema.mjs\n' +
				"Or skip this and run scripts/schema-audit.sql in the SQL editor.",
		);
	}

	const res = await fetch(`${url}/rest/v1/`, {
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			Accept: "application/openapi+json",
		},
	});
	if (!res.ok) {
		throw new Error(`PostgREST returned ${res.status} ${res.statusText}`);
	}
	const spec = await res.json();

	const tables = {};
	for (const [name, def] of Object.entries(spec.definitions ?? {})) {
		const required = new Set(def.required ?? []);
		const columns = {};
		for (const [col, meta] of Object.entries(def.properties ?? {})) {
			const desc = meta.description ?? "";
			// PostgREST encodes "<Primary Key> Note: This is a Primary Key." and
			// default values inside the description string.
			const defaultMatch = desc.match(/Default:\s*(.+?)(?:\.|$)/);
			columns[col] = {
				type: meta.format ?? meta.type,
				notNull: required.has(col),
				hasDefault: /Default:/.test(desc) || meta.default !== undefined,
				default: defaultMatch?.[1]?.trim() ?? meta.default ?? null,
				isPrimaryKey: /Primary Key/i.test(desc),
			};
		}
		tables[name] = columns;
	}

	const names = Object.keys(tables).sort();
	console.log(`Fetched schema for ${names.length} tables.\n`);

	// Columns that will reject an INSERT when absent from the payload.
	const risky = {};
	for (const name of names) {
		const cols = Object.entries(tables[name])
			.filter(([, c]) => c.notNull && !c.hasDefault)
			.map(([col]) => col);
		if (cols.length) risky[name] = cols;
	}

	console.log("Columns that MUST be present in every insert:\n");
	for (const [table, cols] of Object.entries(risky)) {
		console.log(`  ${table}`);
		console.log(`    ${cols.join(", ")}`);
	}

	writeFileSync(
		OUT_PATH,
		JSON.stringify(
			{ fetchedAt: new Date().toISOString(), tables, risky },
			null,
			2,
		),
		"utf8",
	);
	console.log(`\nFull snapshot written to ${OUT_PATH}`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
