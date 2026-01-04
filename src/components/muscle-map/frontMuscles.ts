// Front Body Muscle Paths - Anatomically accurate muscle shapes
// Based on fitness app anatomical diagram style (like the reference image)
import { MusclePathRecord } from "./types";

// Male front body muscles - Anatomically accurate to match reference image
export const MALE_FRONT_MUSCLES: MusclePathRecord = {
	// ========== NECK/TRAPS ==========
	neck_left: {
		path: "M 88 58 L 85 68 L 82 78 L 88 85 L 93 82 L 95 70 L 93 60 Z",
		muscle: "traps",
	},
	neck_right: {
		path: "M 112 58 L 115 68 L 118 78 L 112 85 L 107 82 L 105 70 L 107 60 Z",
		muscle: "traps",
	},

	// ========== SHOULDERS (Deltoids) ==========
	// Left Deltoid - Full rounded cap
	delt_left_front: {
		path: "M 55 85 L 45 88 L 35 98 L 30 115 L 32 135 L 40 148 L 52 155 L 60 152 L 65 140 L 68 120 L 68 100 L 62 88 Z",
		muscle: "shoulders",
	},
	delt_left_side: {
		path: "M 30 115 L 22 130 L 20 150 L 24 170 L 32 185 L 42 190 L 52 185 L 55 170 L 52 155 L 40 148 L 32 135 Z",
		muscle: "shoulders",
	},
	// Right Deltoid
	delt_right_front: {
		path: "M 145 85 L 155 88 L 165 98 L 170 115 L 168 135 L 160 148 L 148 155 L 140 152 L 135 140 L 132 120 L 132 100 L 138 88 Z",
		muscle: "shoulders",
	},
	delt_right_side: {
		path: "M 170 115 L 178 130 L 180 150 L 176 170 L 168 185 L 158 190 L 148 185 L 145 170 L 148 155 L 160 148 L 168 135 Z",
		muscle: "shoulders",
	},

	// ========== CHEST (Pectoralis Major) ==========
	// Left Pec - Large, fan-shaped muscle
	chest_left_upper: {
		path: "M 70 88 L 82 85 L 95 88 L 100 95 L 100 115 L 95 128 L 85 135 L 72 135 L 60 125 L 58 108 L 62 95 Z",
		muscle: "chest",
	},
	chest_left_lower: {
		path: "M 72 135 L 85 135 L 95 138 L 100 150 L 98 170 L 90 185 L 78 188 L 65 182 L 58 168 L 58 150 L 62 138 Z",
		muscle: "chest",
	},
	// Right Pec
	chest_right_upper: {
		path: "M 130 88 L 118 85 L 105 88 L 100 95 L 100 115 L 105 128 L 115 135 L 128 135 L 140 125 L 142 108 L 138 95 Z",
		muscle: "chest",
	},
	chest_right_lower: {
		path: "M 128 135 L 115 135 L 105 138 L 100 150 L 102 170 L 110 185 L 122 188 L 135 182 L 142 168 L 142 150 L 138 138 Z",
		muscle: "chest",
	},

	// ========== BICEPS ==========
	// Left Bicep - Peaked muscle shape
	biceps_left_long: {
		path: "M 50 155 L 42 160 L 38 180 L 38 205 L 42 228 L 48 245 L 55 250 L 60 245 L 62 225 L 60 200 L 58 175 L 55 162 Z",
		muscle: "biceps",
	},
	biceps_left_short: {
		path: "M 55 160 L 60 165 L 64 185 L 64 210 L 62 232 L 58 248 L 55 250 L 48 245 L 50 225 L 52 200 L 52 180 L 52 165 Z",
		muscle: "biceps",
	},
	// Right Bicep
	biceps_right_long: {
		path: "M 150 155 L 158 160 L 162 180 L 162 205 L 158 228 L 152 245 L 145 250 L 140 245 L 138 225 L 140 200 L 142 175 L 145 162 Z",
		muscle: "biceps",
	},
	biceps_right_short: {
		path: "M 145 160 L 140 165 L 136 185 L 136 210 L 138 232 L 142 248 L 145 250 L 152 245 L 150 225 L 148 200 L 148 180 L 148 165 Z",
		muscle: "biceps",
	},

	// ========== TRICEPS (visible from front) ==========
	triceps_left: {
		path: "M 32 158 L 24 165 L 20 190 L 20 220 L 24 248 L 30 272 L 36 285 L 42 285 L 45 265 L 45 235 L 42 205 L 40 175 L 38 162 Z",
		muscle: "triceps",
	},
	triceps_right: {
		path: "M 168 158 L 176 165 L 180 190 L 180 220 L 176 248 L 170 272 L 164 285 L 158 285 L 155 265 L 155 235 L 158 205 L 160 175 L 162 162 Z",
		muscle: "triceps",
	},

	// ========== FOREARMS ==========
	forearms_left_outer: {
		path: "M 36 285 L 30 292 L 26 315 L 24 345 L 26 372 L 30 390 L 38 405 L 48 408 L 52 390 L 50 360 L 48 325 L 46 300 L 44 288 Z",
		muscle: "forearms",
	},
	forearms_left_inner: {
		path: "M 44 288 L 48 292 L 52 315 L 54 348 L 52 378 L 48 398 L 45 408 L 38 405 L 40 380 L 42 350 L 42 320 L 42 295 Z",
		muscle: "forearms",
	},
	forearms_right_outer: {
		path: "M 164 285 L 170 292 L 174 315 L 176 345 L 174 372 L 170 390 L 162 405 L 152 408 L 148 390 L 150 360 L 152 325 L 154 300 L 156 288 Z",
		muscle: "forearms",
	},
	forearms_right_inner: {
		path: "M 156 288 L 152 292 L 148 315 L 146 348 L 148 378 L 152 398 L 155 408 L 162 405 L 160 380 L 158 350 L 158 320 L 158 295 Z",
		muscle: "forearms",
	},

	// ========== ABS (Rectus Abdominis - 6-pack) ==========
	abs_1_left: {
		path: "M 88 188 L 98 188 L 98 210 L 88 212 L 85 205 L 85 195 Z",
		muscle: "abs",
	},
	abs_1_right: {
		path: "M 112 188 L 102 188 L 102 210 L 112 212 L 115 205 L 115 195 Z",
		muscle: "abs",
	},
	abs_2_left: {
		path: "M 86 215 L 98 215 L 98 240 L 86 242 L 84 230 L 84 220 Z",
		muscle: "abs",
	},
	abs_2_right: {
		path: "M 114 215 L 102 215 L 102 240 L 114 242 L 116 230 L 116 220 Z",
		muscle: "abs",
	},
	abs_3_left: {
		path: "M 85 245 L 98 245 L 98 272 L 85 274 L 83 262 L 83 252 Z",
		muscle: "abs",
	},
	abs_3_right: {
		path: "M 115 245 L 102 245 L 102 272 L 115 274 L 117 262 L 117 252 Z",
		muscle: "abs",
	},
	abs_4_left: {
		path: "M 84 277 L 98 277 L 98 298 L 88 302 L 82 292 L 82 282 Z",
		muscle: "abs",
	},
	abs_4_right: {
		path: "M 116 277 L 102 277 L 102 298 L 112 302 L 118 292 L 118 282 Z",
		muscle: "abs",
	},

	// ========== OBLIQUES ==========
	obliques_left: {
		path: "M 65 185 L 58 192 L 52 215 L 48 245 L 48 275 L 52 295 L 62 305 L 72 305 L 78 295 L 82 270 L 82 240 L 80 210 L 75 190 Z",
		muscle: "obliques",
	},
	obliques_right: {
		path: "M 135 185 L 142 192 L 148 215 L 152 245 L 152 275 L 148 295 L 138 305 L 128 305 L 122 295 L 118 270 L 118 240 L 120 210 L 125 190 Z",
		muscle: "obliques",
	},

	// ========== QUADRICEPS ==========
	// Left Quad - Rectus Femoris (center)
	quad_left_rectus: {
		path: "M 82 310 L 88 315 L 92 340 L 95 380 L 95 430 L 92 480 L 88 520 L 85 545 L 92 548 L 98 545 L 102 520 L 105 475 L 105 425 L 102 375 L 98 330 L 95 315 Z",
		muscle: "quadriceps",
	},
	// Left Quad - Vastus Lateralis (outer)
	quad_left_lateral: {
		path: "M 68 315 L 58 325 L 52 355 L 48 400 L 48 455 L 52 505 L 58 540 L 68 560 L 78 560 L 85 545 L 88 520 L 90 480 L 90 430 L 88 380 L 85 340 L 80 320 Z",
		muscle: "quadriceps",
	},
	// Left Quad - Vastus Medialis (inner/teardrop)
	quad_left_medialis: {
		path: "M 95 320 L 98 330 L 102 365 L 105 415 L 105 470 L 102 515 L 98 545 L 92 548 L 85 540 L 82 510 L 82 465 L 82 410 L 85 360 L 88 325 Z",
		muscle: "quadriceps",
	},
	// Right Quad - Rectus Femoris
	quad_right_rectus: {
		path: "M 118 310 L 112 315 L 108 340 L 105 380 L 105 430 L 108 480 L 112 520 L 115 545 L 108 548 L 102 545 L 98 520 L 95 475 L 95 425 L 98 375 L 102 330 L 105 315 Z",
		muscle: "quadriceps",
	},
	// Right Quad - Vastus Lateralis
	quad_right_lateral: {
		path: "M 132 315 L 142 325 L 148 355 L 152 400 L 152 455 L 148 505 L 142 540 L 132 560 L 122 560 L 115 545 L 112 520 L 110 480 L 110 430 L 112 380 L 115 340 L 120 320 Z",
		muscle: "quadriceps",
	},
	// Right Quad - Vastus Medialis
	quad_right_medialis: {
		path: "M 105 320 L 102 330 L 98 365 L 95 415 L 95 470 L 98 515 L 102 545 L 108 548 L 115 540 L 118 510 L 118 465 L 118 410 L 115 360 L 112 325 Z",
		muscle: "quadriceps",
	},

	// ========== CALVES ==========
	// Left Calf - Gastrocnemius + Tibialis
	calves_left_front: {
		path: "M 72 565 L 65 575 L 60 600 L 58 635 L 60 665 L 68 685 L 78 690 L 88 688 L 92 670 L 92 640 L 90 605 L 85 580 L 80 568 Z",
		muscle: "calves",
	},
	calves_left_side: {
		path: "M 58 570 L 52 585 L 50 615 L 52 650 L 58 678 L 68 688 L 78 690 L 85 685 L 88 665 L 88 630 L 85 595 L 80 575 L 72 568 Z",
		muscle: "calves",
	},
	// Right Calf
	calves_right_front: {
		path: "M 128 565 L 135 575 L 140 600 L 142 635 L 140 665 L 132 685 L 122 690 L 112 688 L 108 670 L 108 640 L 110 605 L 115 580 L 120 568 Z",
		muscle: "calves",
	},
	calves_right_side: {
		path: "M 142 570 L 148 585 L 150 615 L 148 650 L 142 678 L 132 688 L 122 690 L 115 685 L 112 665 L 112 630 L 115 595 L 120 575 L 128 568 Z",
		muscle: "calves",
	},
};

// Female front body muscles - toned feminine build
export const FEMALE_FRONT_MUSCLES: MusclePathRecord = {
	// ========== NECK ==========
	neck_left: {
		path: "M 90 68 Q 85 75 84 85 Q 86 92 92 94 Q 95 90 95 82 Q 94 74 90 68",
		muscle: "traps",
	},
	neck_right: {
		path: "M 110 68 Q 115 75 116 85 Q 114 92 108 94 Q 105 90 105 82 Q 106 74 110 68",
		muscle: "traps",
	},

	// ========== SHOULDERS ==========
	delt_left: {
		path: "M 62 92 Q 52 98 50 112 Q 50 128 58 138 Q 66 142 72 135 Q 72 120 70 108 Q 68 98 62 92",
		muscle: "shoulders",
	},
	delt_right: {
		path: "M 138 92 Q 148 98 150 112 Q 150 128 142 138 Q 134 142 128 135 Q 128 120 130 108 Q 132 98 138 92",
		muscle: "shoulders",
	},

	// ========== CHEST ==========
	chest_left: {
		path: "M 68 96 Q 78 94 92 98 Q 98 112 96 130 Q 92 145 82 150 L 66 144 Q 58 130 62 112 Q 64 102 68 96",
		muscle: "chest",
	},
	chest_right: {
		path: "M 132 96 Q 122 94 108 98 Q 102 112 104 130 Q 108 145 118 150 L 134 144 Q 142 130 138 112 Q 136 102 132 96",
		muscle: "chest",
	},

	// ========== ARMS ==========
	biceps_left: {
		path: "M 52 140 Q 46 158 45 180 Q 46 200 52 215 L 60 218 Q 64 198 62 178 Q 60 158 56 145 L 52 140",
		muscle: "biceps",
	},
	biceps_right: {
		path: "M 148 140 Q 154 158 155 180 Q 154 200 148 215 L 140 218 Q 136 198 138 178 Q 140 158 144 145 L 148 140",
		muscle: "biceps",
	},
	triceps_left: {
		path: "M 44 142 Q 40 162 40 185 Q 42 208 48 218 L 52 215 Q 48 195 48 175 Q 48 158 50 145 L 44 142",
		muscle: "triceps",
	},
	triceps_right: {
		path: "M 156 142 Q 160 162 160 185 Q 158 208 152 218 L 148 215 Q 152 195 152 175 Q 152 158 150 145 L 156 142",
		muscle: "triceps",
	},
	forearms_left: {
		path: "M 46 220 Q 40 248 38 280 Q 40 310 48 330 L 58 332 Q 60 305 56 275 Q 52 245 50 225 L 46 220",
		muscle: "forearms",
	},
	forearms_right: {
		path: "M 154 220 Q 160 248 162 280 Q 160 310 152 330 L 142 332 Q 140 305 144 275 Q 148 245 150 225 L 154 220",
		muscle: "forearms",
	},

	// ========== CORE ==========
	abs_upper_left: {
		path: "M 88 155 L 98 155 L 98 180 L 87 180 Q 86 168 88 155",
		muscle: "abs",
	},
	abs_upper_right: {
		path: "M 112 155 L 102 155 L 102 180 L 113 180 Q 114 168 112 155",
		muscle: "abs",
	},
	abs_mid_left: {
		path: "M 87 183 L 98 183 L 98 210 L 86 210 Q 85 198 87 183",
		muscle: "abs",
	},
	abs_mid_right: {
		path: "M 113 183 L 102 183 L 102 210 L 114 210 Q 115 198 113 183",
		muscle: "abs",
	},
	abs_lower_left: {
		path: "M 86 213 L 98 213 L 98 245 Q 94 252 88 250 Q 84 242 86 228 L 86 213",
		muscle: "abs",
	},
	abs_lower_right: {
		path: "M 114 213 L 102 213 L 102 245 Q 106 252 112 250 Q 116 242 114 228 L 114 213",
		muscle: "abs",
	},
	obliques_left: {
		path: "M 64 148 Q 72 145 85 152 L 84 225 Q 82 248 76 265 L 66 260 Q 62 238 64 210 Q 64 178 64 148",
		muscle: "obliques",
	},
	obliques_right: {
		path: "M 136 148 Q 128 145 115 152 L 116 225 Q 118 248 124 265 L 134 260 Q 138 238 136 210 Q 136 178 136 148",
		muscle: "obliques",
	},

	// ========== LEGS ==========
	quad_left_center: {
		path: "M 82 268 Q 76 305 74 355 Q 72 410 78 465 Q 82 490 90 498 L 98 496 Q 100 460 98 410 Q 96 355 94 305 Q 92 278 88 268 L 82 268",
		muscle: "quadriceps",
	},
	quad_left_outer: {
		path: "M 72 270 Q 62 310 58 365 Q 56 425 64 480 Q 70 502 82 505 L 90 498 Q 82 465 80 415 Q 78 355 82 300 Q 84 278 82 268 L 72 270",
		muscle: "quadriceps",
	},
	quad_left_inner: {
		path: "M 88 272 Q 94 310 96 360 Q 98 415 94 475 Q 90 495 88 498 L 98 496 Q 104 470 104 415 Q 104 355 102 300 Q 100 278 96 270 L 88 272",
		muscle: "quadriceps",
	},
	quad_right_center: {
		path: "M 118 268 Q 124 305 126 355 Q 128 410 122 465 Q 118 490 110 498 L 102 496 Q 100 460 102 410 Q 104 355 106 305 Q 108 278 112 268 L 118 268",
		muscle: "quadriceps",
	},
	quad_right_outer: {
		path: "M 128 270 Q 138 310 142 365 Q 144 425 136 480 Q 130 502 118 505 L 110 498 Q 118 465 120 415 Q 122 355 118 300 Q 116 278 118 268 L 128 270",
		muscle: "quadriceps",
	},
	quad_right_inner: {
		path: "M 112 272 Q 106 310 104 360 Q 102 415 106 475 Q 110 495 112 498 L 102 496 Q 96 470 96 415 Q 96 355 98 300 Q 100 278 104 270 L 112 272",
		muscle: "quadriceps",
	},

	// ========== CALVES ==========
	calves_left: {
		path: "M 72 510 Q 66 550 64 600 Q 68 645 78 670 L 90 672 Q 94 640 92 595 Q 88 550 84 515 Q 80 508 72 510",
		muscle: "calves",
	},
	calves_right: {
		path: "M 128 510 Q 134 550 136 600 Q 132 645 122 670 L 110 672 Q 106 640 108 595 Q 112 550 116 515 Q 120 508 128 510",
		muscle: "calves",
	},
};
