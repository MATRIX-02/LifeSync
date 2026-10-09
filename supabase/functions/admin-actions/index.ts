// Admin-only actions that need the service role: personalised push
// notifications and full account deletion. The caller must be signed in and
// have role admin or super_admin in `profiles`; that is checked here, not
// trusted from the app.
//
// Deploy: Supabase dashboard > Edge Functions > Create "admin-actions", paste
// this file. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// provided automatically. Setup SQL: docs/ADMIN_SETUP.md.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH = 100;
const REPO = "MATRIX-02/LifeSync";
const PREMIUM_SLUGS = new Set(["basic", "premium", "enterprise"]);

// Every table holding a user's rows, children before parents.
const USER_TABLES = [
	"habit_logs",
	"user_habits",
	"workout_sessions",
	"workout_plans",
	"personal_records",
	"body_measurements",
	"body_weights",
	"custom_exercises",
	"fitness_profiles",
	"finance_transactions",
	"recurring_transactions",
	"finance_accounts",
	"finance_budgets",
	"savings_goals",
	"bill_reminders",
	"finance_debts",
	"split_groups",
	"study_sessions",
	"study_subjects",
	"study_goals",
	"flashcards",
	"flashcard_decks",
	"revision_schedule",
	"mock_tests",
	"daily_plans",
	"study_notes",
	"ai_usage",
	"payments",
	"user_subscriptions",
];

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

type Recipient = {
	id: string;
	email: string;
	full_name: string | null;
	expo_push_token: string | null;
	plan: string;
	premium: boolean;
};

const personalise = (text: string, r: Recipient) => {
	const name = r.full_name?.trim() || r.email.split("@")[0];
	return text
		.replaceAll("{name}", name)
		.replaceAll("{first_name}", name.split(/\s+/)[0])
		.replaceAll("{email}", r.email)
		.replaceAll("{plan}", r.plan);
};

Deno.serve(async (req) => {
	if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

	const authHeader = req.headers.get("Authorization") ?? "";
	const asCaller = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_ANON_KEY")!,
		{ global: { headers: { Authorization: authHeader } } },
	);
	const { data: userData, error: userError } = await asCaller.auth.getUser();
	if (userError || !userData?.user) return json(401, { error: "unauthorized" });

	const admin = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	);
	const callerId = userData.user.id;
	const { data: caller } = await admin
		.from("profiles")
		.select("role")
		.eq("id", callerId)
		.single();
	if (caller?.role !== "admin" && caller?.role !== "super_admin") {
		return json(403, { error: "forbidden" });
	}

	let body: any;
	try {
		body = await req.json();
	} catch {
		return json(400, { error: "bad_json" });
	}

	if (body?.action === "send_push" || body?.action === "send_update") {
		const isUpdate = body.action === "send_update";
		let title = String(body.title ?? "").trim();
		let message = String(body.body ?? "").trim();
		let data: Record<string, unknown>;
		let extra: Record<string, unknown> = {};

		if (isUpdate) {
			// Same payload as scripts/notify-update.mjs: a tap downloads and
			// installs the APK (src/services/appUpdateService.ts).
			const version = String(body.version ?? "").trim().replace(/^v/, "");
			if (!/^\d+\.\d+\.\d+$/.test(version)) return json(400, { error: "bad_version" });
			const apkUrl = `https://github.com/${REPO}/releases/download/v${version}/LifeSync-v${version}.apk`;
			// The APK must really be there, otherwise every tap is a 404.
			const head = await fetch(apkUrl, { method: "HEAD", redirect: "follow" });
			if (!head.ok) return json(400, { error: "apk_not_found" });
			title ||= `LifeSync ${version} is available`;
			message ||= "Tap to download and install the update.";
			data = { type: "app_update", version, apkUrl };
			extra = { priority: "high", channelId: "app-updates" };
		} else {
			if (!title || !message) return json(400, { error: "missing_text" });
			const route = typeof body.route === "string" ? body.route : undefined;
			data = { type: "admin_message", ...(route ? { route } : {}) };
		}
		const audience: string = body.audience ?? "users";
		const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
		if (audience === "users" && userIds.length === 0) {
			return json(400, { error: "no_recipients" });
		}

		let query = admin
			.from("profiles")
			.select(
				"id, email, full_name, expo_push_token, user_subscriptions(status, subscription_plans(slug, name))",
			)
			.eq("is_active", true);
		if (audience === "users") query = query.in("id", userIds);
		const { data: rows, error } = await query;
		if (error) return json(500, { error: error.message });

		const recipients: Recipient[] = (rows ?? []).map((p: any) => {
			const subs = Array.isArray(p.user_subscriptions)
				? p.user_subscriptions
				: p.user_subscriptions
					? [p.user_subscriptions]
					: [];
			const active = subs.find((s: any) => s?.status === "active");
			const slug = active?.subscription_plans?.slug ?? "free";
			return {
				id: p.id,
				email: p.email,
				full_name: p.full_name,
				expo_push_token: p.expo_push_token,
				plan: active?.subscription_plans?.name ?? "Free",
				premium: PREMIUM_SLUGS.has(slug),
			};
		});

		const targeted = recipients.filter((r) =>
			audience === "premium" ? r.premium : audience === "free" ? !r.premium : true,
		);
		const reachable = targeted.filter((r) => r.expo_push_token);
		const messages = reachable.map((r) => ({
			to: r.expo_push_token,
			sound: "default",
			title: personalise(title, r),
			body: personalise(message, r),
			data,
			...extra,
		}));

		let sent = 0;
		for (let i = 0; i < messages.length; i += EXPO_BATCH) {
			const res = await fetch(EXPO_PUSH_URL, {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify(messages.slice(i, i + EXPO_BATCH)),
			});
			const result = await res.json().catch(() => null);
			for (const ticket of result?.data ?? []) {
				if (ticket?.status === "ok") sent++;
			}
		}

		return json(200, {
			targeted: targeted.length,
			noDevice: targeted.length - reachable.length,
			sent,
		});
	}

	if (body?.action === "delete_user") {
		const userId = String(body.userId ?? "");
		if (!userId) return json(400, { error: "missing_user" });
		if (userId === callerId) return json(400, { error: "cannot_delete_self" });

		const { data: target } = await admin
			.from("profiles")
			.select("role")
			.eq("id", userId)
			.single();
		if (target?.role === "super_admin" && caller.role !== "super_admin") {
			return json(403, { error: "forbidden" });
		}

		// A missing table (e.g. never created on this project) is not fatal.
		const failed: string[] = [];
		for (const table of USER_TABLES) {
			const { error } = await admin.from(table).delete().eq("user_id", userId);
			if (error && error.code !== "42P01" && !/does not exist|schema cache/i.test(error.message)) {
				failed.push(`${table}: ${error.message}`);
			}
		}
		if (failed.length) return json(500, { error: "data_delete_failed", failed });

		await admin.from("profiles").delete().eq("id", userId);
		const { error: authError } = await admin.auth.admin.deleteUser(userId);
		if (authError) return json(500, { error: authError.message });

		return json(200, { deleted: true });
	}

	return json(400, { error: "unknown_action" });
});
