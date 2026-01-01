// Front Body Muscle Paths - Anatomically accurate muscle shapes
import { MusclePathRecord } from "./types";

// Male front body muscles with anatomical definition
export const MALE_FRONT_MUSCLES: MusclePathRecord = {
	// CHEST - Pectoralis Major
	chest_left: {
		path: "M 68 85 Q 58 90 54 100 Q 52 115 58 128 Q 68 138 85 135 Q 95 130 98 118 L 98 95 Q 88 85 68 85",
		muscle: "chest",
	},
	chest_right: {
		path: "M 132 85 Q 142 90 146 100 Q 148 115 142 128 Q 132 138 115 135 Q 105 130 102 118 L 102 95 Q 112 85 132 85",
		muscle: "chest",
	},

	// SHOULDERS - Deltoids (rounded cap shape)
	shoulder_left: {
		path: "M 52 72 Q 40 78 38 92 Q 38 108 45 118 Q 52 122 58 115 Q 56 98 52 85 Q 50 78 52 72",
		muscle: "shoulders",
	},
	shoulder_right: {
		path: "M 148 72 Q 160 78 162 92 Q 162 108 155 118 Q 148 122 142 115 Q 144 98 148 85 Q 150 78 148 72",
		muscle: "shoulders",
	},

	// BICEPS - Defined arm muscle
	biceps_left: {
		path: "M 42 120 Q 36 135 34 155 Q 34 175 40 188 Q 48 195 55 190 Q 58 178 56 158 Q 54 138 48 125 Q 45 118 42 120",
		muscle: "biceps",
	},
	biceps_right: {
		path: "M 158 120 Q 164 135 166 155 Q 166 175 160 188 Q 152 195 145 190 Q 142 178 144 158 Q 146 138 152 125 Q 155 118 158 120",
		muscle: "biceps",
	},

	// FOREARMS
	forearms_left: {
		path: "M 38 192 Q 32 215 30 240 Q 32 265 40 280 Q 50 285 56 278 Q 54 255 52 230 Q 48 205 42 192 Q 40 190 38 192",
		muscle: "forearms",
	},
	forearms_right: {
		path: "M 162 192 Q 168 215 170 240 Q 168 265 160 280 Q 150 285 144 278 Q 146 255 148 230 Q 152 205 158 192 Q 160 190 162 192",
		muscle: "forearms",
	},

	// ABS - 6-pack definition
	abs_upper_l: {
		path: "M 85 138 Q 80 148 80 162 Q 82 172 90 174 L 98 172 L 98 138 Q 92 136 85 138",
		muscle: "abs",
	},
	abs_upper_r: {
		path: "M 115 138 Q 120 148 120 162 Q 118 172 110 174 L 102 172 L 102 138 Q 108 136 115 138",
		muscle: "abs",
	},
	abs_mid_l: {
		path: "M 82 176 Q 80 190 82 204 Q 85 212 92 214 L 98 212 L 98 176 Q 90 174 82 176",
		muscle: "abs",
	},
	abs_mid_r: {
		path: "M 118 176 Q 120 190 118 204 Q 115 212 108 214 L 102 212 L 102 176 Q 110 174 118 176",
		muscle: "abs",
	},
	abs_lower_l: {
		path: "M 84 216 Q 82 230 86 244 Q 90 250 96 250 L 98 248 L 98 216 Q 92 214 84 216",
		muscle: "abs",
	},
	abs_lower_r: {
		path: "M 116 216 Q 118 230 114 244 Q 110 250 104 250 L 102 248 L 102 216 Q 108 214 116 216",
		muscle: "abs",
	},

	// OBLIQUES - Side abs
	obliques_left: {
		path: "M 58 132 Q 52 155 52 185 Q 55 215 62 245 Q 70 255 78 248 Q 78 218 78 185 Q 76 155 72 135 Q 65 130 58 132",
		muscle: "obliques",
	},
	obliques_right: {
		path: "M 142 132 Q 148 155 148 185 Q 145 215 138 245 Q 130 255 122 248 Q 122 218 122 185 Q 124 155 128 135 Q 135 130 142 132",
		muscle: "obliques",
	},

	// QUADRICEPS - Thigh muscles (3 visible heads)
	quad_left_outer: {
		path: "M 62 258 Q 52 290 48 330 Q 48 370 54 400 Q 62 415 74 412 Q 78 395 76 360 Q 74 320 70 280 Q 66 262 62 258",
		muscle: "quadriceps",
	},
	quad_left_mid: {
		path: "M 72 260 Q 70 295 70 335 Q 72 375 78 405 Q 86 415 96 410 Q 96 375 94 335 Q 90 295 84 265 Q 78 258 72 260",
		muscle: "quadriceps",
	},
	quad_left_inner: {
		path: "M 88 268 Q 92 300 96 340 Q 98 375 94 400 Q 98 385 100 355 Q 102 315 100 280 Q 96 268 88 268",
		muscle: "quadriceps",
	},
	quad_right_outer: {
		path: "M 138 258 Q 148 290 152 330 Q 152 370 146 400 Q 138 415 126 412 Q 122 395 124 360 Q 126 320 130 280 Q 134 262 138 258",
		muscle: "quadriceps",
	},
	quad_right_mid: {
		path: "M 128 260 Q 130 295 130 335 Q 128 375 122 405 Q 114 415 104 410 Q 104 375 106 335 Q 110 295 116 265 Q 122 258 128 260",
		muscle: "quadriceps",
	},
	quad_right_inner: {
		path: "M 112 268 Q 108 300 104 340 Q 102 375 106 400 Q 102 385 100 355 Q 98 315 100 280 Q 104 268 112 268",
		muscle: "quadriceps",
	},

	// CALVES - Gastrocnemius
	calves_left: {
		path: "M 52 420 Q 46 455 46 495 Q 50 530 65 545 Q 82 550 88 535 Q 85 495 80 455 Q 72 425 60 418 Q 56 416 52 420",
		muscle: "calves",
	},
	calves_right: {
		path: "M 148 420 Q 154 455 154 495 Q 150 530 135 545 Q 118 550 112 535 Q 115 495 120 455 Q 128 425 140 418 Q 144 416 148 420",
		muscle: "calves",
	},
};

// Female variations - slightly adjusted proportions
export const FEMALE_FRONT_MUSCLES: MusclePathRecord = {
	...MALE_FRONT_MUSCLES,
	// Chest adjusted
	chest_left: {
		path: "M 72 90 Q 64 96 60 108 Q 60 122 68 132 Q 80 138 94 134 L 98 120 Q 98 100 90 92 Q 82 88 72 90",
		muscle: "chest",
	},
	chest_right: {
		path: "M 128 90 Q 136 96 140 108 Q 140 122 132 132 Q 120 138 106 134 L 102 120 Q 102 100 110 92 Q 118 88 128 90",
		muscle: "chest",
	},
};
