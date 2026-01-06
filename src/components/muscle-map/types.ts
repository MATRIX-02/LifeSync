// Muscle Body Map Types - Following react-native-body-highlighter pattern
import { MuscleGroup } from "../../types/workout";

// Styling options for individual body parts
export interface BodyPartStyles {
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
}

// Base body part definition (stored in assets)
export interface BodyPart {
	// Use a flexible slug string to allow asset-driven names (matches upstream assets)
	slug: string;
	// Optional color supplied with some asset exports
	color?: string;
	path?: {
		common?: string[];
		left?: string[];
		right?: string[];
	};
}

// Extended body part with user-provided display properties
export interface ExtendedBodyPart extends BodyPart {
	color?: string;
	intensity?: number; // 0-100 or 1-based index into colors array
	side?: "left" | "right"; // For bilateral muscles
	styles?: BodyPartStyles;
}

export interface MuscleBodyMapProps {
	gender: "male" | "female";
	view: "front" | "back";

	// New flexible data prop (like react-native-body-highlighter)
	data?: ReadonlyArray<ExtendedBodyPart>;

	// Legacy support - will be converted to data format internally
	highlightedMuscles?: Partial<Record<MuscleGroup, number>>; // 0-100 intensity

	// Color palette for intensity-based coloring
	colors?: ReadonlyArray<string>;

	// Default styling
	defaultFill?: string;
	defaultStroke?: string;
	defaultStrokeWidth?: number;

	// Interaction
	onMusclePress?: (
		muscle: ExtendedBodyPart | string,
		side?: "left" | "right"
	) => void;

	// Feature flags
	disabledMuscles?: MuscleGroup[];
	hiddenMuscles?: MuscleGroup[];

	// Display options
	width?: number;
	height?: number;
	showLabels?: boolean;
	border?: string | "none";
	scale?: number;

	theme: {
		text: string;
		textMuted: string;
		background: string;
		surface: string;
		success?: string;
	};
}

// Internal type for asset data
// Compatibility type used by older/front/back muscle path files
export type MusclePathRecord = Record<string, { path: string; muscle: string }>;

export type MuscleAssetRecord = Record<string, BodyPart>;
