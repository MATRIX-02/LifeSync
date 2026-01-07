// NutriPlan Types
import type { FoodItem } from "@/src/types/nutrition";

export type SubTab = "log" | "hydration" | "gut" | "fasting" | "insights";

export interface FoodWithQuantity {
	food: FoodItem;
	quantity: number;
}

export interface NutriPlanProps {
	theme: any;
}
