/** Groq-backed workout plan suggestions built from the user's goals and history. */

import type {
	FitnessProfile,
	WorkoutSession,
} from "@/src/context/workoutStoreDB/types";
import type { Exercise } from "@/src/types/workout";
import { AiInsightsError, callGroq, round } from "./core";

export interface SuggestedExercise {
	exerciseId: string;
	name: string;
	sets: number;
	reps: number;
	restSeconds: number;
	reason: string;
}

export interface SuggestedPlan {
	name: string;
	rationale: string;
	estimatedMinutes: number;
	exercises: SuggestedExercise[];
	/** Exercises deliberately avoided, e.g. because of a logged injury. */
	avoided: string[];
}

export type PlanSuggestionResult =
	| { ok: true; plan: SuggestedPlan; generatedAt: string }
	| AiInsightsError;

const SYSTEM_PROMPT = `You are a strength coach building one workout session. You output JSON only.

You receive the user's profile, their recent training, and a catalogue of exercises they can choose from.

Return exactly:
{
  "name": "short plan name",
  "rationale": "why this plan suits them",
  "estimatedMinutes": 0,
  "exercises": [{ "exerciseId": "...", "sets": 0, "reps": 0, "restSeconds": 0, "reason": "..." }],
  "avoided": ["exercise name and why, under 10 words"]
}

RULES:
- "exerciseId" MUST be copied exactly from the "catalogue" array. Never invent an id or use one that is not listed.
- Pick 4 to 6 exercises. Order them compound-first.
- Match "sets", "reps" and "restSeconds" to the user's goals: strength means lower reps and longer rest, muscle growth means moderate reps, endurance means higher reps and short rest.
- Respect "fitnessLevel". Do not prescribe advanced movements to a beginner.
- If "injuries" is non-empty, exclude anything that loads the injured area and list it in "avoided" with the reason.
- Prefer muscles listed in "underworkedMuscles" and go easy on those in "recentlyTrainedMuscles".
- "reason" per exercise under 12 words. "rationale" under 25 words.
- Be terse. The response is capped.`;

/**
 * Trims the catalogue to what the model can reasonably choose from — sending
 * 200+ exercises with full instructions would blow the token budget.
 */
function buildCatalogue(
	exercises: Exercise[],
	profile: FitnessProfile | null,
): {
	exerciseId: string;
	name: string;
	muscles: string[];
	difficulty: string;
}[] {
	const levelOrder = ["beginner", "intermediate", "advanced", "athlete"];
	const userLevelIndex = profile?.fitnessLevel
		? levelOrder.indexOf(profile.fitnessLevel)
		: levelOrder.length - 1;

	return exercises
		.filter(
			(e) => levelOrder.indexOf(e.difficulty ?? "beginner") <= userLevelIndex,
		)
		.slice(0, 120)
		.map((e) => ({
			exerciseId: e.id,
			name: e.name,
			muscles: e.targetMuscles ?? [],
			difficulty: e.difficulty ?? "beginner",
		}));
}

export async function suggestWorkoutPlan(args: {
	profile: FitnessProfile | null;
	recentSessions: WorkoutSession[];
	exercises: Exercise[];
	focusMuscle?: string;
}): Promise<PlanSuggestionResult> {
	const { profile, recentSessions, exercises, focusMuscle } = args;

	const catalogue = buildCatalogue(exercises, profile);

	if (catalogue.length === 0) {
		return {
			ok: false,
			code: "no_data",
			message: "No exercises are available to build a plan from.",
		};
	}

	// Volume over the last 14 sessions tells us what is over- and under-trained.
	const muscleSets = new Map<string, number>();
	const recent = recentSessions.slice(-14);
	for (const session of recent) {
		for (const ex of session.exercises ?? []) {
			const done = (ex.sets ?? []).filter((s) => s.completed).length;
			if (done === 0) continue;
			for (const m of ex.targetMuscles ?? []) {
				muscleSets.set(m, (muscleSets.get(m) ?? 0) + done);
			}
		}
	}

	const allMuscles = new Set(catalogue.flatMap((c) => c.muscles));
	const ranked = Array.from(allMuscles).map((m) => ({
		muscle: m,
		sets: muscleSets.get(m) ?? 0,
	}));

	const payload = {
		profile: {
			fitnessLevel: profile?.fitnessLevel,
			goals: profile?.goals,
			injuries: profile?.injuries,
			equipment: profile?.equipment,
			weeklyWorkoutGoal: profile?.weeklyWorkoutGoal,
		},
		focusMuscle,
		recentWorkouts: recent.length,
		recentlyTrainedMuscles: ranked
			.filter((r) => r.sets > 0)
			.sort((a, b) => b.sets - a.sets)
			.slice(0, 6),
		underworkedMuscles: ranked
			.filter((r) => r.sets === 0)
			.map((r) => r.muscle)
			.slice(0, 8),
		catalogue,
	};

	const result = await callGroq({
		systemPrompt: SYSTEM_PROMPT,
		payload,
		maxTokens: 900,
		jsonMode: true,
	});

	if (!result.ok) return result;

	try {
		const raw = JSON.parse(result.text);
		const byId = new Map(catalogue.map((c) => [c.exerciseId, c]));

		const picked: SuggestedExercise[] = (
			Array.isArray(raw?.exercises) ? raw.exercises : []
		)
			// Drop anything hallucinated rather than trusting the id.
			.filter((e: any) => byId.has(String(e?.exerciseId)))
			.slice(0, 8)
			.map((e: any) => {
				const match = byId.get(String(e.exerciseId))!;
				return {
					exerciseId: match.exerciseId,
					name: match.name,
					sets: Math.max(1, Math.min(10, Math.round(e?.sets ?? 3))),
					reps: Math.max(1, Math.min(50, Math.round(e?.reps ?? 10))),
					restSeconds: Math.max(
						15,
						Math.min(300, Math.round(e?.restSeconds ?? 60)),
					),
					reason: typeof e?.reason === "string" ? e.reason : "",
				};
			});

		if (picked.length === 0) {
			return {
				ok: false,
				code: "empty_response",
				message: "The suggestion did not include any valid exercises. Retry.",
			};
		}

		return {
			ok: true,
			plan: {
				name: typeof raw?.name === "string" ? raw.name : "Suggested Plan",
				rationale: typeof raw?.rationale === "string" ? raw.rationale : "",
				estimatedMinutes:
					typeof raw?.estimatedMinutes === "number"
						? round(raw.estimatedMinutes)
						: picked.length * 5 + 10,
				exercises: picked,
				avoided: Array.isArray(raw?.avoided)
					? raw.avoided
							.filter((a: any): a is string => typeof a === "string")
							.slice(0, 4)
					: [],
			},
			generatedAt: new Date().toISOString(),
		};
	} catch {
		return {
			ok: false,
			code: "empty_response",
			message:
				"The suggestion came back in an unreadable format. Please retry.",
		};
	}
}
