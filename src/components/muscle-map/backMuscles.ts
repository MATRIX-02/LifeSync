// Back Body Muscle Paths - Anatomically accurate muscle shapes
// Based on fitness app anatomical diagram style (like the reference image)
import { MusclePathRecord } from "./types";

// Male back body muscles - muscular build with defined separation
export const MALE_BACK_MUSCLES: MusclePathRecord = {
	// ========== TRAPEZIUS (Upper, Middle, Lower) ==========
	// Upper Traps - Left
	traps_upper_left: {
		path: "M 88 68 Q 78 72 72 82 Q 70 95 78 108 L 98 105 Q 96 90 94 78 Q 92 70 88 68",
		muscle: "traps",
	},
	// Upper Traps - Right
	traps_upper_right: {
		path: "M 112 68 Q 122 72 128 82 Q 130 95 122 108 L 102 105 Q 104 90 106 78 Q 108 70 112 68",
		muscle: "traps",
	},
	// Middle Traps - Left
	traps_mid_left: {
		path: "M 78 110 Q 68 118 65 132 Q 68 148 78 155 L 98 145 Q 92 130 88 118 Q 84 112 78 110",
		muscle: "traps",
	},
	// Middle Traps - Right
	traps_mid_right: {
		path: "M 122 110 Q 132 118 135 132 Q 132 148 122 155 L 102 145 Q 108 130 112 118 Q 116 112 122 110",
		muscle: "traps",
	},

	// ========== REAR DELTOIDS ==========
	rear_delt_left: {
		path: "M 58 92 Q 48 100 46 118 Q 48 135 56 145 Q 65 148 70 140 Q 68 122 66 108 Q 64 98 58 92",
		muscle: "shoulders",
	},
	rear_delt_right: {
		path: "M 142 92 Q 152 100 154 118 Q 152 135 144 145 Q 135 148 130 140 Q 132 122 134 108 Q 136 98 142 92",
		muscle: "shoulders",
	},

	// ========== RHOMBOIDS (Upper Back) ==========
	rhomboid_left: {
		path: "M 78 115 Q 72 130 74 150 Q 78 165 88 168 L 98 158 Q 92 145 90 130 Q 88 118 82 115 L 78 115",
		muscle: "back",
	},
	rhomboid_right: {
		path: "M 122 115 Q 128 130 126 150 Q 122 165 112 168 L 102 158 Q 108 145 110 130 Q 112 118 118 115 L 122 115",
		muscle: "back",
	},

	// ========== LATISSIMUS DORSI (Lats - V-shape) ==========
	// Left Lat - Upper portion
	lats_left_upper: {
		path: "M 55 135 Q 45 155 45 185 Q 50 210 62 225 L 78 218 Q 72 195 70 170 Q 68 150 65 140 L 55 135",
		muscle: "lats",
	},
	// Left Lat - Lower portion
	lats_left_lower: {
		path: "M 62 225 Q 55 245 58 268 Q 65 285 78 292 L 88 285 Q 82 268 80 248 Q 78 232 78 218 L 62 225",
		muscle: "lats",
	},
	// Right Lat - Upper portion
	lats_right_upper: {
		path: "M 145 135 Q 155 155 155 185 Q 150 210 138 225 L 122 218 Q 128 195 130 170 Q 132 150 135 140 L 145 135",
		muscle: "lats",
	},
	// Right Lat - Lower portion
	lats_right_lower: {
		path: "M 138 225 Q 145 245 142 268 Q 135 285 122 292 L 112 285 Q 118 268 120 248 Q 122 232 122 218 L 138 225",
		muscle: "lats",
	},

	// ========== TERES MAJOR/MINOR ==========
	teres_left: {
		path: "M 56 145 Q 50 158 52 175 Q 58 188 68 192 L 72 185 Q 68 172 68 160 Q 68 150 62 145 L 56 145",
		muscle: "lats",
	},
	teres_right: {
		path: "M 144 145 Q 150 158 148 175 Q 142 188 132 192 L 128 185 Q 132 172 132 160 Q 132 150 138 145 L 144 145",
		muscle: "lats",
	},

	// ========== ERECTOR SPINAE (Lower Back) ==========
	lower_back_left: {
		path: "M 85 200 Q 78 225 78 260 Q 82 290 92 310 L 98 305 Q 94 280 94 250 Q 94 225 92 205 L 85 200",
		muscle: "lower_back",
	},
	lower_back_right: {
		path: "M 115 200 Q 122 225 122 260 Q 118 290 108 310 L 102 305 Q 106 280 106 250 Q 106 225 108 205 L 115 200",
		muscle: "lower_back",
	},

	// ========== TRICEPS (Back of Arms) ==========
	// Left Tricep - Long head
	triceps_left_long: {
		path: "M 50 148 Q 44 172 44 200 Q 48 228 56 245 L 64 242 Q 58 220 58 195 Q 58 172 60 155 L 50 148",
		muscle: "triceps",
	},
	// Left Tricep - Lateral head
	triceps_left_lat: {
		path: "M 44 150 Q 38 175 38 205 Q 42 232 50 248 L 56 245 Q 50 222 48 195 Q 48 168 52 152 L 44 150",
		muscle: "triceps",
	},
	// Right Tricep - Long head
	triceps_right_long: {
		path: "M 150 148 Q 156 172 156 200 Q 152 228 144 245 L 136 242 Q 142 220 142 195 Q 142 172 140 155 L 150 148",
		muscle: "triceps",
	},
	// Right Tricep - Lateral head
	triceps_right_lat: {
		path: "M 156 150 Q 162 175 162 205 Q 158 232 150 248 L 144 245 Q 150 222 152 195 Q 152 168 148 152 L 156 150",
		muscle: "triceps",
	},

	// ========== FOREARMS (Back view - Extensors) ==========
	forearms_left: {
		path: "M 48 250 Q 42 278 40 310 Q 42 340 50 360 L 60 362 Q 62 335 58 305 Q 54 275 52 255 L 48 250",
		muscle: "forearms",
	},
	forearms_right: {
		path: "M 152 250 Q 158 278 160 310 Q 158 340 150 360 L 140 362 Q 138 335 142 305 Q 146 275 148 255 L 152 250",
		muscle: "forearms",
	},

	// ========== GLUTEUS MAXIMUS (Glutes) ==========
	glutes_left_upper: {
		path: "M 68 305 Q 58 325 56 350 Q 58 375 68 390 L 85 385 Q 82 365 82 345 Q 82 325 78 310 L 68 305",
		muscle: "glutes",
	},
	glutes_left_lower: {
		path: "M 68 390 Q 60 408 60 430 Q 65 448 78 455 L 90 448 Q 85 430 84 412 Q 84 398 85 385 L 68 390",
		muscle: "glutes",
	},
	glutes_right_upper: {
		path: "M 132 305 Q 142 325 144 350 Q 142 375 132 390 L 115 385 Q 118 365 118 345 Q 118 325 122 310 L 132 305",
		muscle: "glutes",
	},
	glutes_right_lower: {
		path: "M 132 390 Q 140 408 140 430 Q 135 448 122 455 L 110 448 Q 115 430 116 412 Q 116 398 115 385 L 132 390",
		muscle: "glutes",
	},

	// ========== HAMSTRINGS ==========
	// Left Hamstring - Biceps Femoris (outer)
	hamstrings_left_outer: {
		path: "M 62 455 Q 54 490 52 540 Q 54 590 66 620 L 78 618 Q 74 585 74 545 Q 74 500 72 465 L 62 455",
		muscle: "hamstrings",
	},
	// Left Hamstring - Semitendinosus (inner)
	hamstrings_left_inner: {
		path: "M 80 458 Q 85 495 88 545 Q 88 595 82 625 L 78 618 L 66 620 Q 74 590 78 545 Q 80 498 78 465 L 80 458",
		muscle: "hamstrings",
	},
	// Left Hamstring - Semimembranosus (deep/middle)
	hamstrings_left_mid: {
		path: "M 72 460 Q 78 500 80 550 Q 80 600 75 630 L 78 618 Q 82 580 82 540 Q 80 495 76 462 L 72 460",
		muscle: "hamstrings",
	},
	// Right Hamstring - Biceps Femoris
	hamstrings_right_outer: {
		path: "M 138 455 Q 146 490 148 540 Q 146 590 134 620 L 122 618 Q 126 585 126 545 Q 126 500 128 465 L 138 455",
		muscle: "hamstrings",
	},
	// Right Hamstring - Semitendinosus
	hamstrings_right_inner: {
		path: "M 120 458 Q 115 495 112 545 Q 112 595 118 625 L 122 618 L 134 620 Q 126 590 122 545 Q 120 498 122 465 L 120 458",
		muscle: "hamstrings",
	},
	// Right Hamstring - Semimembranosus
	hamstrings_right_mid: {
		path: "M 128 460 Q 122 500 120 550 Q 120 600 125 630 L 122 618 Q 118 580 118 540 Q 120 495 124 462 L 128 460",
		muscle: "hamstrings",
	},

	// ========== CALVES (Gastrocnemius + Soleus) ==========
	// Left Calf - Gastrocnemius Medial
	calves_left_med: {
		path: "M 74 625 Q 68 658 68 700 Q 72 738 82 758 L 92 755 Q 88 725 88 690 Q 88 655 84 630 L 74 625",
		muscle: "calves",
	},
	// Left Calf - Gastrocnemius Lateral
	calves_left_lat: {
		path: "M 60 628 Q 54 665 56 705 Q 60 742 70 762 L 82 758 Q 74 730 72 695 Q 72 658 74 630 L 60 628",
		muscle: "calves",
	},
	// Right Calf - Gastrocnemius Medial
	calves_right_med: {
		path: "M 126 625 Q 132 658 132 700 Q 128 738 118 758 L 108 755 Q 112 725 112 690 Q 112 655 116 630 L 126 625",
		muscle: "calves",
	},
	// Right Calf - Gastrocnemius Lateral
	calves_right_lat: {
		path: "M 140 628 Q 146 665 144 705 Q 140 742 130 762 L 118 758 Q 126 730 128 695 Q 128 658 126 630 L 140 628",
		muscle: "calves",
	},
};

// Female back body muscles - toned feminine build
export const FEMALE_BACK_MUSCLES: MusclePathRecord = {
	// ========== TRAPEZIUS ==========
	traps_upper_left: {
		path: "M 90 70 Q 82 76 78 88 Q 78 102 86 112 L 98 108 Q 96 94 95 82 Q 94 75 90 70",
		muscle: "traps",
	},
	traps_upper_right: {
		path: "M 110 70 Q 118 76 122 88 Q 122 102 114 112 L 102 108 Q 104 94 105 82 Q 106 75 110 70",
		muscle: "traps",
	},
	traps_mid_left: {
		path: "M 82 115 Q 72 125 70 142 Q 74 158 84 165 L 98 155 Q 92 142 90 128 Q 88 120 82 115",
		muscle: "traps",
	},
	traps_mid_right: {
		path: "M 118 115 Q 128 125 130 142 Q 126 158 116 165 L 102 155 Q 108 142 110 128 Q 112 120 118 115",
		muscle: "traps",
	},

	// ========== REAR DELTOIDS ==========
	rear_delt_left: {
		path: "M 62 98 Q 52 108 52 125 Q 56 142 66 150 Q 74 148 76 138 Q 74 122 72 110 Q 70 102 62 98",
		muscle: "shoulders",
	},
	rear_delt_right: {
		path: "M 138 98 Q 148 108 148 125 Q 144 142 134 150 Q 126 148 124 138 Q 126 122 128 110 Q 130 102 138 98",
		muscle: "shoulders",
	},

	// ========== LATS ==========
	lats_left: {
		path: "M 60 145 Q 50 175 52 215 Q 58 250 72 275 L 86 268 Q 78 242 76 210 Q 74 178 72 155 L 60 145",
		muscle: "lats",
	},
	lats_right: {
		path: "M 140 145 Q 150 175 148 215 Q 142 250 128 275 L 114 268 Q 122 242 124 210 Q 126 178 128 155 L 140 145",
		muscle: "lats",
	},

	// ========== LOWER BACK ==========
	lower_back_left: {
		path: "M 86 205 Q 80 235 82 275 Q 86 305 96 325 L 98 318 Q 94 290 94 260 Q 94 232 92 210 L 86 205",
		muscle: "lower_back",
	},
	lower_back_right: {
		path: "M 114 205 Q 120 235 118 275 Q 114 305 104 325 L 102 318 Q 106 290 106 260 Q 106 232 108 210 L 114 205",
		muscle: "lower_back",
	},

	// ========== TRICEPS ==========
	triceps_left: {
		path: "M 54 152 Q 46 180 48 212 Q 54 242 64 260 L 72 255 Q 64 230 64 205 Q 64 180 66 160 L 54 152",
		muscle: "triceps",
	},
	triceps_right: {
		path: "M 146 152 Q 154 180 152 212 Q 146 242 136 260 L 128 255 Q 136 230 136 205 Q 136 180 134 160 L 146 152",
		muscle: "triceps",
	},

	// ========== FOREARMS ==========
	forearms_left: {
		path: "M 58 262 Q 52 292 52 328 Q 56 360 66 380 L 76 378 Q 72 352 70 320 Q 68 290 66 268 L 58 262",
		muscle: "forearms",
	},
	forearms_right: {
		path: "M 142 262 Q 148 292 148 328 Q 144 360 134 380 L 124 378 Q 128 352 130 320 Q 132 290 134 268 L 142 262",
		muscle: "forearms",
	},

	// ========== GLUTES ==========
	glutes_left: {
		path: "M 72 320 Q 60 350 60 390 Q 66 425 82 445 L 96 438 Q 88 415 88 385 Q 88 350 84 328 L 72 320",
		muscle: "glutes",
	},
	glutes_right: {
		path: "M 128 320 Q 140 350 140 390 Q 134 425 118 445 L 104 438 Q 112 415 112 385 Q 112 350 116 328 L 128 320",
		muscle: "glutes",
	},

	// ========== HAMSTRINGS ==========
	hamstrings_left: {
		path: "M 68 448 Q 60 495 60 555 Q 66 610 80 645 L 94 640 Q 86 600 86 555 Q 86 505 82 460 L 68 448",
		muscle: "hamstrings",
	},
	hamstrings_right: {
		path: "M 132 448 Q 140 495 140 555 Q 134 610 120 645 L 106 640 Q 114 600 114 555 Q 114 505 118 460 L 132 448",
		muscle: "hamstrings",
	},

	// ========== CALVES ==========
	calves_left: {
		path: "M 70 650 Q 62 690 64 740 Q 70 782 84 805 L 96 800 Q 88 770 88 730 Q 88 690 84 658 L 70 650",
		muscle: "calves",
	},
	calves_right: {
		path: "M 130 650 Q 138 690 136 740 Q 130 782 116 805 L 104 800 Q 112 770 112 730 Q 112 690 116 658 L 130 650",
		muscle: "calves",
	},
};
