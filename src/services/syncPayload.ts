// Builds the full cloud-sync payload from the current store state.
//
// Shared by the Settings screen's "Sync All" button and by auto-sync, so the
// two can never drift apart on which fields get pushed.
import { useAuthStore } from "../context/authStore";
import { useFinanceStore } from "../context/financeStoreDB";
import { useHabitStore } from "../context/habitStoreDB";
import { useStudyStore } from "../context/studyStoreDB/index";
import { useWorkoutStore } from "../context/workoutStoreDB";

export const buildSyncPayload = async () => {
	const authProfile = useAuthStore.getState().profile;
	const habitStore = useHabitStore.getState();
	const workoutStore = useWorkoutStore.getState();
	const financeStore = useFinanceStore.getState();
	const studyStore = useStudyStore.getState();

	return {
		profile: authProfile || null,
		habits: {
			habits: habitStore.habits || [],
			logs: habitStore.logs || [],
			settings: habitStore.settings,
		},
		workouts: {
			fitnessProfile: workoutStore.fitnessProfile,
			workoutPlans: workoutStore.workoutPlans,
			workoutSessions: workoutStore.workoutSessions,
			personalRecords: workoutStore.personalRecords,
			bodyMeasurements: workoutStore.bodyMeasurements,
			bodyWeights: workoutStore.bodyWeights,
			customExercises: workoutStore.customExercises,
		},
		finance: {
			accounts: financeStore.accounts || [],
			transactions: financeStore.transactions || [],
			recurringTransactions: financeStore.recurringTransactions || [],
			budgets: financeStore.budgets || [],
			savingsGoals: financeStore.savingsGoals || [],
			billReminders: financeStore.billReminders || [],
			debts: financeStore.debts || [],
			splitGroups: financeStore.splitGroups || [],
			currency: financeStore.currency || "INR",
		},
		study: {
			studyGoals: studyStore.studyGoals,
			subjects: studyStore.subjects,
			studySessions: studyStore.studySessions,
			flashcardDecks: studyStore.flashcardDecks,
			flashcards: studyStore.flashcards,
			revisionSchedule: studyStore.revisionSchedule,
			mockTests: studyStore.mockTests,
			dailyPlans: studyStore.dailyPlans,
			studyNotes: studyStore.studyNotes,
		},
	};
};

export default buildSyncPayload;
