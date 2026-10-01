import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FinancePrefsStore {
	hideBalance: boolean;
	toggleHideBalance: () => void;
	setHideBalance: (hidden: boolean) => void;
}

export const useFinancePrefsStore = create<FinancePrefsStore>()(
	persist(
		(set, get) => ({
			hideBalance: false,
			toggleHideBalance: () => set({ hideBalance: !get().hideBalance }),
			setHideBalance: (hidden) => set({ hideBalance: hidden }),
		}),
		{
			name: "finance-prefs",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
