// Muscle Body Map Component - Realistic muscular body SVG visualization

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
	Path,
	G,
	Defs,
	LinearGradient,
	Stop,
	Ellipse,
} from "react-native-svg";
import { MuscleGroup } from "../types/workout";
import { MUSCLE_GROUP_INFO } from "../data/exerciseDatabase";

interface MuscleBodyMapProps {
	gender: "male" | "female";
	highlightedMuscles?: Partial<Record<MuscleGroup, number>>; // 0-100 intensity
	onMusclePress?: (muscle: MuscleGroup) => void;
	width?: number;
	height?: number;
	showLabels?: boolean;
	theme: {
		text: string;
		textMuted: string;
		background: string;
		surface: string;
		success?: string;
	};
	view: "front" | "back";
}

// Realistic Male Front Muscles with anatomical detail
const MALE_FRONT_MUSCLES: Record<
	string,
	{ path: string; muscle: MuscleGroup }
> = {
	// Chest - Pectoralis Major (detailed with upper and lower sections)
	chest_left_upper: {
		path: "M 72 98 Q 65 102 62 110 Q 60 118 65 126 Q 76 132 90 129 L 100 116 Q 100 106 95 100 Q 85 95 72 98",
		muscle: "chest",
	},
	chest_left_lower: {
		path: "M 65 126 Q 62 134 65 144 Q 70 152 82 154 Q 94 152 100 146 L 100 116 Q 90 129 76 132 Q 68 130 65 126",
		muscle: "chest",
	},
	chest_right_upper: {
		path: "M 128 98 Q 135 102 138 110 Q 140 118 135 126 Q 124 132 110 129 L 100 116 Q 100 106 105 100 Q 115 95 128 98",
		muscle: "chest",
	},
	chest_right_lower: {
		path: "M 135 126 Q 138 134 135 144 Q 130 152 118 154 Q 106 152 100 146 L 100 116 Q 110 129 124 132 Q 132 130 135 126",
		muscle: "chest",
	},

	// Shoulders - Deltoids (rounded muscular caps)
	shoulders_left_front: {
		path: "M 56 86 Q 46 92 44 106 Q 44 120 50 130 Q 58 134 64 128 L 66 112 Q 64 98 60 90 Q 58 86 56 86",
		muscle: "shoulders",
	},
	shoulders_left_side: {
		path: "M 60 82 Q 52 86 48 96 Q 46 106 50 118 Q 54 100 60 90 Q 64 86 68 84 Q 64 82 60 82",
		muscle: "shoulders",
	},
	shoulders_right_front: {
		path: "M 144 86 Q 154 92 156 106 Q 156 120 150 130 Q 142 134 136 128 L 134 112 Q 136 98 140 90 Q 142 86 144 86",
		muscle: "shoulders",
	},
	shoulders_right_side: {
		path: "M 140 82 Q 148 86 152 96 Q 154 106 150 118 Q 146 100 140 90 Q 136 86 132 84 Q 136 82 140 82",
		muscle: "shoulders",
	},

	// Biceps (defined peak shape)
	biceps_left: {
		path: "M 46 130 Q 40 142 38 160 Q 36 180 42 196 Q 50 204 58 200 Q 64 194 66 182 Q 64 162 60 145 Q 56 134 50 130 Q 48 128 46 130",
		muscle: "biceps",
	},
	biceps_left_peak: {
		path: "M 52 138 Q 56 150 58 165 Q 58 178 54 188 Q 62 180 62 165 Q 60 150 56 140 Q 54 136 52 138",
		muscle: "biceps",
	},
	biceps_right: {
		path: "M 154 130 Q 160 142 162 160 Q 164 180 158 196 Q 150 204 142 200 Q 136 194 134 182 Q 136 162 140 145 Q 144 134 150 130 Q 152 128 154 130",
		muscle: "biceps",
	},
	biceps_right_peak: {
		path: "M 148 138 Q 144 150 142 165 Q 142 178 146 188 Q 138 180 138 165 Q 140 150 144 140 Q 146 136 148 138",
		muscle: "biceps",
	},

	// Forearms (brachioradialis definition)
	forearms_left: {
		path: "M 40 200 Q 34 220 32 245 Q 30 270 36 290 Q 44 300 52 296 Q 58 290 60 270 Q 58 245 54 220 Q 50 204 44 200 Q 42 198 40 200",
		muscle: "forearms",
	},
	forearms_right: {
		path: "M 160 200 Q 166 220 168 245 Q 170 270 164 290 Q 156 300 148 296 Q 142 290 140 270 Q 142 245 146 220 Q 150 204 156 200 Q 158 198 160 200",
		muscle: "forearms",
	},

	// Abs (defined 6-pack with separations)
	abs_upper_left: {
		path: "M 86 154 Q 82 162 82 174 Q 84 184 90 186 Q 96 186 100 184 L 100 154 Q 94 152 86 154",
		muscle: "abs",
	},
	abs_upper_right: {
		path: "M 114 154 Q 118 162 118 174 Q 116 184 110 186 Q 104 186 100 184 L 100 154 Q 106 152 114 154",
		muscle: "abs",
	},
	abs_mid_left: {
		path: "M 84 188 Q 82 198 84 210 Q 86 218 92 220 Q 96 220 100 218 L 100 188 Q 94 186 84 188",
		muscle: "abs",
	},
	abs_mid_right: {
		path: "M 116 188 Q 118 198 116 210 Q 114 218 108 220 Q 104 220 100 218 L 100 188 Q 106 186 116 188",
		muscle: "abs",
	},
	abs_lower_left: {
		path: "M 86 222 Q 84 232 86 244 Q 90 252 96 254 Q 98 254 100 252 L 100 222 Q 96 220 86 222",
		muscle: "abs",
	},
	abs_lower_right: {
		path: "M 114 222 Q 116 232 114 244 Q 110 252 104 254 Q 102 254 100 252 L 100 222 Q 104 220 114 222",
		muscle: "abs",
	},

	// Obliques (external obliques definition)
	obliques_left: {
		path: "M 64 152 Q 58 170 58 195 Q 60 220 68 245 Q 76 258 82 252 Q 84 235 84 210 Q 82 180 78 160 Q 72 150 64 152",
		muscle: "obliques",
	},
	obliques_right: {
		path: "M 136 152 Q 142 170 142 195 Q 140 220 132 245 Q 124 258 118 252 Q 116 235 116 210 Q 118 180 122 160 Q 128 150 136 152",
		muscle: "obliques",
	},

	// Quadriceps (vastus lateralis, rectus femoris, vastus medialis - defined)
	quadriceps_left_outer: {
		path: "M 66 268 Q 58 295 54 330 Q 52 365 56 395 Q 64 412 76 414 Q 84 410 86 398 Q 82 360 82 325 Q 80 292 74 272 Q 70 266 66 268",
		muscle: "quadriceps",
	},
	quadriceps_left_center: {
		path: "M 76 268 Q 74 295 74 330 Q 76 365 80 392 Q 86 406 96 408 Q 102 402 104 390 Q 100 355 98 320 Q 94 288 86 270 Q 80 266 76 268",
		muscle: "quadriceps",
	},
	quadriceps_left_inner: {
		path: "M 90 278 Q 94 305 98 340 Q 100 370 96 395 Q 94 404 88 406 Q 96 398 100 375 Q 104 340 104 305 Q 102 282 96 274 Q 92 272 90 278",
		muscle: "quadriceps",
	},
	quadriceps_right_outer: {
		path: "M 134 268 Q 142 295 146 330 Q 148 365 144 395 Q 136 412 124 414 Q 116 410 114 398 Q 118 360 118 325 Q 120 292 126 272 Q 130 266 134 268",
		muscle: "quadriceps",
	},
	quadriceps_right_center: {
		path: "M 124 268 Q 126 295 126 330 Q 124 365 120 392 Q 114 406 104 408 Q 98 402 96 390 Q 100 355 102 320 Q 106 288 114 270 Q 120 266 124 268",
		muscle: "quadriceps",
	},
	quadriceps_right_inner: {
		path: "M 110 278 Q 106 305 102 340 Q 100 370 104 395 Q 106 404 112 406 Q 104 398 100 375 Q 96 340 96 305 Q 98 282 104 274 Q 108 272 110 278",
		muscle: "quadriceps",
	},

	// Calves (gastrocnemius - defined diamond shape)
	calves_left: {
		path: "M 58 422 Q 50 455 48 490 Q 52 520 66 532 Q 80 538 88 530 Q 92 515 88 485 Q 84 450 76 425 Q 68 418 58 422",
		muscle: "calves",
	},
	calves_right: {
		path: "M 142 422 Q 150 455 152 490 Q 148 520 134 532 Q 120 538 112 530 Q 108 515 112 485 Q 116 450 124 425 Q 132 418 142 422",
		muscle: "calves",
	},
};

// Realistic Male Back Muscles
const MALE_BACK_MUSCLES: Record<string, { path: string; muscle: MuscleGroup }> =
	{
		// Trapezius (upper, middle sections)
		traps_upper_left: {
			path: "M 78 74 Q 68 80 66 92 Q 74 100 90 105 Q 95 100 98 92 Q 92 82 85 76 Q 82 74 78 74",
			muscle: "traps",
		},
		traps_upper_right: {
			path: "M 122 74 Q 132 80 134 92 Q 126 100 110 105 Q 105 100 102 92 Q 108 82 115 76 Q 118 74 122 74",
			muscle: "traps",
		},
		traps_mid_left: {
			path: "M 74 98 Q 66 110 66 126 Q 74 134 88 138 Q 95 132 98 120 Q 92 108 86 100 Q 80 96 74 98",
			muscle: "traps",
		},
		traps_mid_right: {
			path: "M 126 98 Q 134 110 134 126 Q 126 134 112 138 Q 105 132 102 120 Q 108 108 114 100 Q 120 96 126 98",
			muscle: "traps",
		},

		// Lats (latissimus dorsi - V-shape definition)
		lats_left_upper: {
			path: "M 60 110 Q 50 125 48 145 Q 52 165 60 180 Q 72 190 84 184 Q 90 170 88 150 Q 84 130 76 115 Q 68 108 60 110",
			muscle: "lats",
		},
		lats_left_lower: {
			path: "M 60 180 Q 56 200 60 220 Q 68 238 82 242 Q 94 236 98 218 Q 94 198 88 182 Q 78 188 60 180",
			muscle: "lats",
		},
		lats_right_upper: {
			path: "M 140 110 Q 150 125 152 145 Q 148 165 140 180 Q 128 190 116 184 Q 110 170 112 150 Q 116 130 124 115 Q 132 108 140 110",
			muscle: "lats",
		},
		lats_right_lower: {
			path: "M 140 180 Q 144 200 140 220 Q 132 238 118 242 Q 106 236 102 218 Q 106 198 112 182 Q 122 188 140 180",
			muscle: "lats",
		},

		// Lower Back (erector spinae)
		lower_back_left: {
			path: "M 82 210 Q 74 230 74 255 Q 78 275 90 282 Q 98 278 100 262 Q 100 238 96 218 Q 90 208 82 210",
			muscle: "lower_back",
		},
		lower_back_right: {
			path: "M 118 210 Q 126 230 126 255 Q 122 275 110 282 Q 102 278 100 262 Q 100 238 104 218 Q 110 208 118 210",
			muscle: "lower_back",
		},

		// Triceps (3 heads definition)
		triceps_left_long: {
			path: "M 50 115 Q 42 135 40 165 Q 44 195 54 210 Q 64 216 70 206 Q 66 175 62 145 Q 58 125 52 115 Q 50 112 50 115",
			muscle: "triceps",
		},
		triceps_left_lateral: {
			path: "M 54 125 Q 48 145 48 168 Q 52 188 58 200 Q 64 196 66 180 Q 66 158 62 138 Q 58 128 54 125",
			muscle: "triceps",
		},
		triceps_right_long: {
			path: "M 150 115 Q 158 135 160 165 Q 156 195 146 210 Q 136 216 130 206 Q 134 175 138 145 Q 142 125 148 115 Q 150 112 150 115",
			muscle: "triceps",
		},
		triceps_right_lateral: {
			path: "M 146 125 Q 152 145 152 168 Q 148 188 142 200 Q 136 196 134 180 Q 134 158 138 138 Q 142 128 146 125",
			muscle: "triceps",
		},

		// Rear Deltoids
		rear_delts_left: {
			path: "M 54 92 Q 44 100 42 118 Q 46 132 56 140 Q 66 136 68 120 Q 66 104 60 95 Q 56 92 54 92",
			muscle: "shoulders",
		},
		rear_delts_right: {
			path: "M 146 92 Q 156 100 158 118 Q 154 132 144 140 Q 134 136 132 120 Q 134 104 140 95 Q 144 92 146 92",
			muscle: "shoulders",
		},

		// Glutes (gluteus maximus - rounded)
		glutes_left: {
			path: "M 70 280 Q 60 300 58 330 Q 64 358 80 370 Q 96 376 100 360 Q 102 335 100 310 Q 94 290 84 280 Q 78 276 70 280",
			muscle: "glutes",
		},
		glutes_right: {
			path: "M 130 280 Q 140 300 142 330 Q 136 358 120 370 Q 104 376 100 360 Q 98 335 100 310 Q 106 290 116 280 Q 122 276 130 280",
			muscle: "glutes",
		},

		// Hamstrings (biceps femoris, semitendinosus - defined)
		hamstrings_left_outer: {
			path: "M 62 375 Q 56 410 54 450 Q 58 485 72 498 Q 84 494 88 478 Q 84 440 82 405 Q 78 385 70 375 Q 66 372 62 375",
			muscle: "hamstrings",
		},
		hamstrings_left_inner: {
			path: "M 80 378 Q 84 415 88 455 Q 90 485 86 500 Q 98 492 102 468 Q 106 430 102 395 Q 96 378 88 372 Q 84 370 80 378",
			muscle: "hamstrings",
		},
		hamstrings_right_outer: {
			path: "M 138 375 Q 144 410 146 450 Q 142 485 128 498 Q 116 494 112 478 Q 116 440 118 405 Q 122 385 130 375 Q 134 372 138 375",
			muscle: "hamstrings",
		},
		hamstrings_right_inner: {
			path: "M 120 378 Q 116 415 112 455 Q 110 485 114 500 Q 102 492 98 468 Q 94 430 98 395 Q 104 378 112 372 Q 116 370 120 378",
			muscle: "hamstrings",
		},

		// Calves (back view - gastrocnemius)
		calves_back_left: {
			path: "M 58 505 Q 52 540 52 575 Q 58 600 74 610 Q 90 605 94 585 Q 90 550 84 520 Q 76 505 66 502 Q 62 500 58 505",
			muscle: "calves",
		},
		calves_back_right: {
			path: "M 142 505 Q 148 540 148 575 Q 142 600 126 610 Q 110 605 106 585 Q 110 550 116 520 Q 124 505 134 502 Q 138 500 142 505",
			muscle: "calves",
		},

		// Rhomboids / Mid Back
		back_left: {
			path: "M 78 118 Q 70 140 74 165 Q 82 182 96 178 Q 102 160 100 138 Q 96 122 88 114 Q 84 114 78 118",
			muscle: "back",
		},
		back_right: {
			path: "M 122 118 Q 130 140 126 165 Q 118 182 104 178 Q 98 160 100 138 Q 104 122 112 114 Q 116 114 122 118",
			muscle: "back",
		},
	};

// Female variations (proportionally adjusted)
const FEMALE_FRONT_MUSCLES: Record<
	string,
	{ path: string; muscle: MuscleGroup }
> = {
	...MALE_FRONT_MUSCLES,
	// Chest adjusted for feminine figure
	chest_left_upper: {
		path: "M 76 102 Q 70 108 68 118 Q 68 128 74 136 Q 84 140 96 138 L 100 122 Q 100 112 96 106 Q 88 100 76 102",
		muscle: "chest",
	},
	chest_left_lower: {
		path: "M 74 136 Q 72 144 76 152 Q 82 158 92 160 Q 98 158 100 152 L 100 122 Q 96 138 84 140 Q 76 138 74 136",
		muscle: "chest",
	},
	chest_right_upper: {
		path: "M 124 102 Q 130 108 132 118 Q 132 128 126 136 Q 116 140 104 138 L 100 122 Q 100 112 104 106 Q 112 100 124 102",
		muscle: "chest",
	},
	chest_right_lower: {
		path: "M 126 136 Q 128 144 124 152 Q 118 158 108 160 Q 102 158 100 152 L 100 122 Q 104 138 116 140 Q 124 138 126 136",
		muscle: "chest",
	},
};

const FEMALE_BACK_MUSCLES = { ...MALE_BACK_MUSCLES };

const MuscleBodyMap: React.FC<MuscleBodyMapProps> = ({
	gender,
	highlightedMuscles = {},
	onMusclePress,
	width = 200,
	height = 520,
	showLabels = false,
	theme,
	view,
}) => {
	const muscles =
		view === "front"
			? gender === "male"
				? MALE_FRONT_MUSCLES
				: FEMALE_FRONT_MUSCLES
			: gender === "male"
			? MALE_BACK_MUSCLES
			: FEMALE_BACK_MUSCLES;

	const getMuscleColor = (muscle: MuscleGroup, intensity: number = 0) => {
		const baseColor = MUSCLE_GROUP_INFO[muscle]?.color || "#888";
		if (intensity === 0) return theme.surface + "60";

		// Interpolate between surface color and muscle color based on intensity
		const opacity = Math.min(1, intensity / 100);
		return (
			baseColor +
			Math.round(opacity * 180 + 75)
				.toString(16)
				.padStart(2, "0")
		);
	};

	const getIntensity = (muscle: MuscleGroup): number => {
		return highlightedMuscles[muscle] || 0;
	};

	// Skin tones
	const skinTone = gender === "male" ? "#C9A078" : "#DDB896";
	const skinToneLight = gender === "male" ? "#D4B088" : "#E8C8A8";
	const outlineColor = theme.textMuted + "50";
	const muscleLineColor = theme.textMuted + "30";

	return (
		<View style={[styles.container, { width, height }]}>
			<Svg width={width} height={height} viewBox="0 0 200 620">
				<Defs>
					<LinearGradient id="skinGradient" x1="0" y1="0" x2="1" y2="1">
						<Stop offset="0%" stopColor={skinToneLight} />
						<Stop offset="100%" stopColor={skinTone} />
					</LinearGradient>
					<LinearGradient id="muscleShading" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
						<Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
					</LinearGradient>
				</Defs>

				{/* Muscular Body Outline */}
				<G>
					{/* Head - Athletic with strong jaw */}
					<Ellipse
						cx="100"
						cy="36"
						rx="22"
						ry="28"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>
					{/* Hairline suggestion */}
					<Path
						d="M 80 20 Q 90 8 100 6 Q 110 8 120 20 Q 115 12 100 10 Q 85 12 80 20"
						fill={theme.textMuted + "30"}
					/>
					{/* Ears */}
					<Ellipse
						cx="76"
						cy="36"
						rx="4"
						ry="6"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.5"
					/>
					<Ellipse
						cx="124"
						cy="36"
						rx="4"
						ry="6"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.5"
					/>

					{/* Neck - Thick and muscular */}
					<Path
						d="M 86 60 Q 82 68 82 76 L 118 76 Q 118 68 114 60 Q 108 58 100 58 Q 92 58 86 60"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.6"
					/>
					{/* Neck muscles (sternocleidomastoid hint) */}
					<Path
						d="M 86 62 Q 90 70 92 76"
						stroke={muscleLineColor}
						strokeWidth="0.4"
						fill="none"
					/>
					<Path
						d="M 114 62 Q 110 70 108 76"
						stroke={muscleLineColor}
						strokeWidth="0.4"
						fill="none"
					/>

					{/* Torso - Athletic V-shape */}
					<Path
						d={
							view === "front"
								? "M 56 84 Q 44 98 42 125 Q 40 160 48 200 Q 54 240 66 268 Q 78 278 100 280 Q 122 278 134 268 Q 146 240 152 200 Q 160 160 158 125 Q 156 98 144 84 Q 130 76 100 76 Q 70 76 56 84"
								: "M 56 84 Q 44 98 42 125 Q 40 160 48 200 Q 54 240 66 280 Q 78 295 100 298 Q 122 295 134 280 Q 146 240 152 200 Q 160 160 158 125 Q 156 98 144 84 Q 130 76 100 76 Q 70 76 56 84"
						}
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>

					{/* Arms - Muscular with definition */}
					{/* Left arm */}
					<Path
						d="M 50 92 Q 36 118 32 160 Q 30 205 34 250 Q 38 290 42 310 Q 50 322 60 318 Q 68 310 70 295 Q 66 250 68 205 Q 70 158 72 120"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>
					{/* Right arm */}
					<Path
						d="M 150 92 Q 164 118 168 160 Q 170 205 166 250 Q 162 290 158 310 Q 150 322 140 318 Q 132 310 130 295 Q 134 250 132 205 Q 130 158 128 120"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>

					{/* Legs - Powerful thighs */}
					{/* Left leg */}
					<Path
						d="M 66 272 Q 50 320 48 385 Q 46 450 50 515 Q 52 560 48 595 Q 56 612 78 612 Q 95 605 98 592 Q 94 555 98 500 Q 102 440 100 380 Q 98 320 90 280 Q 82 270 72 270"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>
					{/* Right leg */}
					<Path
						d="M 134 272 Q 150 320 152 385 Q 154 450 150 515 Q 148 560 152 595 Q 144 612 122 612 Q 105 605 102 592 Q 106 555 102 500 Q 98 440 100 380 Q 102 320 110 280 Q 118 270 128 270"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="1.2"
					/>

					{/* Hands */}
					<Ellipse
						cx="48"
						cy="324"
						rx="12"
						ry="16"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.6"
					/>
					<Ellipse
						cx="152"
						cy="324"
						rx="12"
						ry="16"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.6"
					/>

					{/* Feet */}
					<Path
						d="M 54 600 Q 48 610 58 618 Q 78 622 94 618 Q 102 608 98 598"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.6"
					/>
					<Path
						d="M 146 600 Q 152 610 142 618 Q 122 622 106 618 Q 98 608 102 598"
						fill="url(#skinGradient)"
						stroke={outlineColor}
						strokeWidth="0.6"
					/>
				</G>

				{/* Muscle Definition Lines (subtle anatomical details) */}
				{view === "front" && (
					<G opacity="0.25">
						{/* Chest separation line */}
						<Path
							d="M 100 100 L 100 155"
							stroke={theme.textMuted}
							strokeWidth="0.6"
						/>
						{/* Ab lines - horizontal */}
						<Path
							d="M 88 172 Q 100 175 112 172"
							stroke={theme.textMuted}
							strokeWidth="0.4"
						/>
						<Path
							d="M 88 195 Q 100 198 112 195"
							stroke={theme.textMuted}
							strokeWidth="0.4"
						/>
						<Path
							d="M 88 218 Q 100 220 112 218"
							stroke={theme.textMuted}
							strokeWidth="0.4"
						/>
						{/* Linea alba */}
						<Path
							d="M 100 155 L 100 255"
							stroke={theme.textMuted}
							strokeWidth="0.5"
						/>
						{/* V-line hint */}
						<Path
							d="M 86 248 Q 94 260 100 268"
							stroke={theme.textMuted}
							strokeWidth="0.3"
						/>
						<Path
							d="M 114 248 Q 106 260 100 268"
							stroke={theme.textMuted}
							strokeWidth="0.3"
						/>
					</G>
				)}

				{view === "back" && (
					<G opacity="0.25">
						{/* Spine line */}
						<Path
							d="M 100 80 L 100 275"
							stroke={theme.textMuted}
							strokeWidth="0.5"
						/>
						{/* Scapula hints */}
						<Path
							d="M 72 105 Q 80 120 78 140"
							stroke={theme.textMuted}
							strokeWidth="0.4"
						/>
						<Path
							d="M 128 105 Q 120 120 122 140"
							stroke={theme.textMuted}
							strokeWidth="0.4"
						/>
					</G>
				)}

				{/* Muscle groups with realistic shading */}
				<G>
					{Object.entries(muscles).map(([key, { path, muscle }]) => {
						const intensity = getIntensity(muscle);
						const muscleColor = MUSCLE_GROUP_INFO[muscle]?.color || "#666";
						return (
							<G key={key}>
								<Path
									d={path}
									fill={getMuscleColor(muscle, intensity)}
									stroke={intensity > 15 ? muscleColor + "80" : "transparent"}
									strokeWidth={intensity > 40 ? 1.2 : 0.6}
									opacity={intensity > 0 ? 0.88 : 0.12}
									onPress={() => onMusclePress?.(muscle)}
								/>
								{/* Muscle highlight overlay when active */}
								{intensity > 50 && (
									<Path d={path} fill="url(#muscleShading)" opacity={0.3} />
								)}
							</G>
						);
					})}
				</G>
			</Svg>

			{showLabels && (
				<View style={styles.labelsContainer}>
					<Text style={[styles.viewLabel, { color: theme.text }]}>
						{view === "front" ? "Front View" : "Back View"}
					</Text>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	labelsContainer: {
		position: "absolute",
		bottom: 10,
		alignItems: "center",
	},
	viewLabel: {
		fontSize: 12,
		fontWeight: "600",
	},
});

export default MuscleBodyMap;
