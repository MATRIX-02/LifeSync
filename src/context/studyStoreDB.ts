import { supabase } from "@/src/config/supabase";
import { create } from "zustand";

// SSB Data Types
export interface SDEntry {
	id: string;
	date: string;
	content: string;
	createdAt: string;
}

export interface PPDTEntry {
	id: string;
	date: string;
	topicsDiscussed: string;
	pointsMade: number;
	notes: string;
	createdAt: string;
}

export interface TATEntry {
	id: string;
	date: string;
	scenario: string;
	response: string;
	reflection: string;
	createdAt: string;
}

export interface WATEntry {
	id: string;
	word: string;
	response: string;
	date: string;
	createdAt: string;
}

export interface SRTEntry {
	id: string;
	situation: string;
	reaction: string;
	date: string;
	createdAt: string;
}

export interface GDEntry {
	id: string;
	topic: string;
	pointsMade: string[];
	performanceRating: number;
	notes: string;
	date: string;
	createdAt: string;
}

export interface GPEEntry {
	id: string;
	imageUri?: string;
	question: string;
	response: string;
	date: string;
	createdAt: string;
}

export interface PIQEntry {
	id: string;
	question: string;
	answer: string;
	date: string;
	createdAt: string;
}

export interface CurrentAffairsEntry {
	id: string;
	date: string;
	topic: string;
	details: string;
	importance: "low" | "medium" | "high";
	createdAt: string;
}

export interface SubjectKnowledgeEntry {
	id: string;
	subject: string;
	topic: string;
	details: string;
	date: string;
	createdAt: string;
}

export interface SSBData {
	sd: SDEntry[];
	ppdt: PPDTEntry[];
	tat: TATEntry[];
	wat: WATEntry[];
	srt: SRTEntry[];
	gd: GDEntry[];
	gpe: GPEEntry[];
	piq: PIQEntry[];
	currentAffairs: CurrentAffairsEntry[];
	subjectKnowledge: SubjectKnowledgeEntry[];
}

interface StudyStoreState {
	// SSB Data
	ssbData: SSBData;

	// UI States
	isLoading: boolean;
	error: string | null;

	// Actions
	addSDEntry: (entry: SDEntry) => void;
	deleteSDEntry: (id: string) => void;
	addPPDTEntry: (entry: PPDTEntry) => void;
	deletePPDTEntry: (id: string) => void;
	addTATEntry: (entry: TATEntry) => void;
	deleteTATEntry: (id: string) => void;
	addWATEntry: (entry: WATEntry) => void;
	deleteWATEntry: (id: string) => void;
	addSRTEntry: (entry: SRTEntry) => void;
	deleteSRTEntry: (id: string) => void;
	addGDEntry: (entry: GDEntry) => void;
	deleteGDEntry: (id: string) => void;
	addGPEEntry: (entry: GPEEntry) => void;
	deleteGPEEntry: (id: string) => void;
	addPIQEntry: (entry: PIQEntry) => void;
	deletePIQEntry: (id: string) => void;
	addCAEntry: (entry: CurrentAffairsEntry) => void;
	deleteCAEntry: (id: string) => void;
	addSKEntry: (entry: SubjectKnowledgeEntry) => void;
	deleteSKEntry: (id: string) => void;

	// Database Operations
	syncToCloud: (userId: string) => Promise<void>;
	restoreFromCloud: (userId: string) => Promise<void>;
	importData: (data: SSBData) => void;
	exportData: () => SSBData;
	clearAllData: () => void;
	refreshFromDatabase: () => Promise<void>;
}

export const useStudyStore = create<StudyStoreState>((set, get) => ({
	// Initial state
	ssbData: {
		sd: [],
		ppdt: [],
		tat: [],
		wat: [],
		srt: [],
		gd: [],
		gpe: [],
		piq: [],
		currentAffairs: [],
		subjectKnowledge: [],
	},
	isLoading: false,
	error: null,

	// SD Actions
	addSDEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				sd: [...state.ssbData.sd, entry],
			},
		}));
		// Optionally sync to cloud here
	},

	deleteSDEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				sd: state.ssbData.sd.filter((e) => e.id !== id),
			},
		}));
	},

	// PPDT Actions
	addPPDTEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				ppdt: [...state.ssbData.ppdt, entry],
			},
		}));
	},

	deletePPDTEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				ppdt: state.ssbData.ppdt.filter((e) => e.id !== id),
			},
		}));
	},

	// TAT Actions
	addTATEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				tat: [...state.ssbData.tat, entry],
			},
		}));
	},

	deleteTATEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				tat: state.ssbData.tat.filter((e) => e.id !== id),
			},
		}));
	},

	// WAT Actions
	addWATEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				wat: [...state.ssbData.wat, entry],
			},
		}));
	},

	deleteWATEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				wat: state.ssbData.wat.filter((e) => e.id !== id),
			},
		}));
	},

	// SRT Actions
	addSRTEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				srt: [...state.ssbData.srt, entry],
			},
		}));
	},

	deleteSRTEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				srt: state.ssbData.srt.filter((e) => e.id !== id),
			},
		}));
	},

	// GD Actions
	addGDEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				gd: [...state.ssbData.gd, entry],
			},
		}));
	},

	deleteGDEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				gd: state.ssbData.gd.filter((e) => e.id !== id),
			},
		}));
	},

	// GPE Actions
	addGPEEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				gpe: [...state.ssbData.gpe, entry],
			},
		}));
	},

	deleteGPEEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				gpe: state.ssbData.gpe.filter((e) => e.id !== id),
			},
		}));
	},

	// PIQ Actions
	addPIQEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				piq: [...state.ssbData.piq, entry],
			},
		}));
	},

	deletePIQEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				piq: state.ssbData.piq.filter((e) => e.id !== id),
			},
		}));
	},

	// Current Affairs Actions
	addCAEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				currentAffairs: [...state.ssbData.currentAffairs, entry],
			},
		}));
	},

	deleteCAEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				currentAffairs: state.ssbData.currentAffairs.filter((e) => e.id !== id),
			},
		}));
	},

	// Subject Knowledge Actions
	addSKEntry: (entry) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				subjectKnowledge: [...state.ssbData.subjectKnowledge, entry],
			},
		}));
	},

	deleteSKEntry: (id) => {
		set((state) => ({
			ssbData: {
				...state.ssbData,
				subjectKnowledge: state.ssbData.subjectKnowledge.filter(
					(e) => e.id !== id
				),
			},
		}));
	},

	// Database Operations
	syncToCloud: async (userId: string) => {
		try {
			set({ isLoading: true, error: null });
			const { ssbData } = get();

			const { error } = await supabase.from("study_data").upsert(
				{
					user_id: userId,
					ssb_data: ssbData as any,
					updated_at: new Date().toISOString(),
				} as any,
				{ onConflict: "user_id" }
			);

			if (error) throw error;
			set({ isLoading: false });
		} catch (error: any) {
			set({
				error: error.message || "Failed to sync to cloud",
				isLoading: false,
			});
			throw error;
		}
	},

	restoreFromCloud: async (userId: string) => {
		try {
			set({ isLoading: true, error: null });

			const { data, error } = await supabase
				.from("study_data")
				.select("ssb_data")
				.eq("user_id", userId)
				.single();

			if (error) throw error;
			if ((data as any)?.ssb_data) {
				set({ ssbData: (data as any).ssb_data, isLoading: false });
			} else {
				set({ isLoading: false });
			}
		} catch (error: any) {
			set({
				error: error.message || "Failed to restore from cloud",
				isLoading: false,
			});
			throw error;
		}
	},

	importData: (data: SSBData) => {
		set({ ssbData: data });
	},

	exportData: () => {
		return get().ssbData;
	},

	clearAllData: () => {
		set({
			ssbData: {
				sd: [],
				ppdt: [],
				tat: [],
				wat: [],
				srt: [],
				gd: [],
				gpe: [],
				piq: [],
				currentAffairs: [],
				subjectKnowledge: [],
			},
		});
	},

	refreshFromDatabase: async () => {
		// This would refresh from local database if needed
		// For now, just clear loading state
		set({ isLoading: false });
	},
}));
