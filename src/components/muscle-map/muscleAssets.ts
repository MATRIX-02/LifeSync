// Muscle Assets - Converted to react-native-body-highlighter pattern
// Paths organized by muscle group with left/right/common variants
import { BodyPart } from "./types";

// Helper to convert old format to new format
const convertToBodyPart = (
	paths: Record<string, string>,
	slug: any
): BodyPart => {
	const bodyPart: BodyPart = { slug, path: {} };

	const leftPaths: string[] = [];
	const rightPaths: string[] = [];
	const commonPaths: string[] = [];

	Object.entries(paths).forEach(([key, path]) => {
		if (key.includes("_left")) {
			leftPaths.push(path);
		} else if (key.includes("_right")) {
			rightPaths.push(path);
		} else {
			commonPaths.push(path);
		}
	});

	if (commonPaths.length > 0) bodyPart.path!.common = commonPaths;
	if (leftPaths.length > 0) bodyPart.path!.left = leftPaths;
	if (rightPaths.length > 0) bodyPart.path!.right = rightPaths;

	return bodyPart;
};

// MALE FRONT MUSCLES
export const MALE_FRONT_MUSCLE_ASSETS: ReadonlyArray<BodyPart> = [
	// TRAPS (Neck)
	convertToBodyPart(
		{
			neck_left: "M 88 58 L 85 68 L 82 78 L 88 85 L 93 82 L 95 70 L 93 60 Z",
			neck_right:
				"M 112 58 L 115 68 L 118 78 L 112 85 L 107 82 L 105 70 L 107 60 Z",
		},
		"traps"
	),

	// SHOULDERS
	convertToBodyPart(
		{
			delt_left_front:
				"M 55 85 L 45 88 L 35 98 L 30 115 L 32 135 L 40 148 L 52 155 L 60 152 L 65 140 L 68 120 L 68 100 L 62 88 Z",
			delt_left_side:
				"M 30 115 L 22 130 L 20 150 L 24 170 L 32 185 L 42 190 L 52 185 L 55 170 L 52 155 L 40 148 L 32 135 Z",
			delt_right_front:
				"M 145 85 L 155 88 L 165 98 L 170 115 L 168 135 L 160 148 L 148 155 L 140 152 L 135 140 L 132 120 L 132 100 L 138 88 Z",
			delt_right_side:
				"M 170 115 L 178 130 L 180 150 L 176 170 L 168 185 L 158 190 L 148 185 L 145 170 L 148 155 L 160 148 L 168 135 Z",
		},
		"shoulders"
	),

	// CHEST
	convertToBodyPart(
		{
			chest_left_upper:
				"M 70 88 L 82 85 L 95 88 L 100 95 L 100 115 L 95 128 L 85 135 L 72 135 L 60 125 L 58 108 L 62 95 Z",
			chest_left_lower:
				"M 72 135 L 85 135 L 95 138 L 100 150 L 98 170 L 90 185 L 78 188 L 65 182 L 58 168 L 58 150 L 62 138 Z",
			chest_right_upper:
				"M 130 88 L 118 85 L 105 88 L 100 95 L 100 115 L 105 128 L 115 135 L 128 135 L 140 125 L 142 108 L 138 95 Z",
			chest_right_lower:
				"M 128 135 L 115 135 L 105 138 L 100 150 L 102 170 L 110 185 L 122 188 L 135 182 L 142 168 L 142 150 L 138 138 Z",
		},
		"chest"
	),

	// BICEPS
	convertToBodyPart(
		{
			biceps_left_long:
				"M 50 155 L 42 160 L 38 180 L 38 205 L 42 228 L 48 245 L 55 250 L 60 245 L 62 225 L 60 200 L 58 175 L 55 162 Z",
			biceps_left_short:
				"M 55 160 L 60 165 L 64 185 L 64 210 L 62 232 L 58 248 L 55 250 L 48 245 L 50 225 L 52 200 L 52 180 L 52 165 Z",
			biceps_right_long:
				"M 150 155 L 158 160 L 162 180 L 162 205 L 158 228 L 152 245 L 145 250 L 140 245 L 138 225 L 140 200 L 142 175 L 145 162 Z",
			biceps_right_short:
				"M 145 160 L 140 165 L 136 185 L 136 210 L 138 232 L 142 248 L 145 250 L 152 245 L 150 225 L 148 200 L 148 180 L 148 165 Z",
		},
		"biceps"
	),

	// TRICEPS
	convertToBodyPart(
		{
			triceps_left:
				"M 32 158 L 24 165 L 20 190 L 20 220 L 24 248 L 30 272 L 36 285 L 42 285 L 45 265 L 45 235 L 42 205 L 40 175 L 38 162 Z",
			triceps_right:
				"M 168 158 L 176 165 L 180 190 L 180 220 L 176 248 L 170 272 L 164 285 L 158 285 L 155 265 L 155 235 L 158 205 L 160 175 L 162 162 Z",
		},
		"triceps"
	),

	// FOREARMS
	convertToBodyPart(
		{
			forearms_left_outer:
				"M 36 285 L 30 292 L 26 315 L 24 345 L 26 372 L 30 390 L 38 405 L 48 408 L 52 390 L 50 360 L 48 325 L 46 300 L 44 288 Z",
			forearms_left_inner:
				"M 44 288 L 48 292 L 52 315 L 54 348 L 52 378 L 48 398 L 45 408 L 38 405 L 40 380 L 42 350 L 42 320 L 42 295 Z",
			forearms_right_outer:
				"M 164 285 L 170 292 L 174 315 L 176 345 L 174 372 L 170 390 L 162 405 L 152 408 L 148 390 L 150 360 L 152 325 L 154 300 L 156 288 Z",
			forearms_right_inner:
				"M 156 288 L 152 292 L 148 315 L 146 348 L 148 378 L 152 398 L 155 408 L 162 405 L 160 380 L 158 350 L 158 320 L 158 295 Z",
		},
		"forearms"
	),

	// ABS
	convertToBodyPart(
		{
			abs_1_left: "M 88 188 L 98 188 L 98 210 L 88 212 L 85 205 L 85 195 Z",
			abs_1_right:
				"M 112 188 L 102 188 L 102 210 L 112 212 L 115 205 L 115 195 Z",
			abs_2_left: "M 86 215 L 98 215 L 98 240 L 86 242 L 84 230 L 84 220 Z",
			abs_2_right:
				"M 114 215 L 102 215 L 102 240 L 114 242 L 116 230 L 116 220 Z",
			abs_3_left: "M 85 245 L 98 245 L 98 272 L 85 274 L 83 262 L 83 252 Z",
			abs_3_right:
				"M 115 245 L 102 245 L 102 272 L 115 274 L 117 262 L 117 252 Z",
			abs_4_left: "M 84 277 L 98 277 L 98 298 L 88 302 L 82 292 L 82 282 Z",
			abs_4_right:
				"M 116 277 L 102 277 L 102 298 L 112 302 L 118 292 L 118 282 Z",
		},
		"abs"
	),

	// OBLIQUES
	convertToBodyPart(
		{
			obliques_left:
				"M 65 185 L 58 192 L 52 215 L 48 245 L 48 275 L 52 295 L 62 305 L 72 305 L 78 295 L 82 270 L 82 240 L 80 210 L 75 190 Z",
			obliques_right:
				"M 135 185 L 142 192 L 148 215 L 152 245 L 152 275 L 148 295 L 138 305 L 128 305 L 122 295 L 118 270 L 118 240 L 120 210 L 125 190 Z",
		},
		"obliques"
	),

	// QUADRICEPS
	convertToBodyPart(
		{
			quad_left_rectus:
				"M 82 315 L 88 318 L 92 345 L 94 385 L 94 430 L 92 475 L 88 515 L 82 548 L 78 548 L 75 515 L 73 475 L 73 430 L 75 385 L 78 345 L 78 320 Z",
			quad_left_vastus_lateralis:
				"M 62 325 L 68 330 L 73 360 L 76 405 L 76 455 L 74 505 L 70 545 L 65 560 L 60 560 L 58 535 L 58 490 L 60 440 L 62 385 L 62 345 Z",
			quad_left_vastus_medialis:
				"M 88 325 L 95 330 L 98 365 L 98 415 L 96 470 L 92 520 L 86 552 L 82 548 L 84 510 L 86 465 L 86 415 L 84 365 Z",
			quad_right_rectus:
				"M 118 315 L 112 318 L 108 345 L 106 385 L 106 430 L 108 475 L 112 515 L 118 548 L 122 548 L 125 515 L 127 475 L 127 430 L 125 385 L 122 345 L 122 320 Z",
			quad_right_vastus_lateralis:
				"M 138 325 L 132 330 L 127 360 L 124 405 L 124 455 L 126 505 L 130 545 L 135 560 L 140 560 L 142 535 L 142 490 L 140 440 L 138 385 L 138 345 Z",
			quad_right_vastus_medialis:
				"M 112 325 L 105 330 L 102 365 L 102 415 L 104 470 L 108 520 L 114 552 L 118 548 L 116 510 L 114 465 L 114 415 L 116 365 Z",
		},
		"quadriceps"
	),

	// CALVES (front view - tibialis anterior)
	convertToBodyPart(
		{
			calf_left:
				"M 68 555 L 72 558 L 76 585 L 78 620 L 78 652 L 76 675 L 70 680 L 64 680 L 60 670 L 58 640 L 58 605 L 62 570 Z",
			calf_right:
				"M 132 555 L 128 558 L 124 585 L 122 620 L 122 652 L 124 675 L 130 680 L 136 680 L 140 670 L 142 640 L 142 605 L 138 570 Z",
		},
		"calves"
	),
];

// Note: BACK muscles, FEMALE variants would follow the same pattern
// For brevity, showing just the male front. You would convert all muscle files similarly.
