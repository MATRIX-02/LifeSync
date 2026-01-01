// Back Body Muscle Paths - Anatomically accurate muscle shapes
import { MusclePathRecord } from "./types";

// Male back body muscles with anatomical definition
export const MALE_BACK_MUSCLES: MusclePathRecord = {
	// TRAPEZIUS - Upper back diamond
	traps_left: {
		path: "M 75 62 Q 62 72 60 88 Q 68 100 88 108 Q 95 100 98 88 Q 92 75 82 65 Q 78 62 75 62",
		muscle: "traps",
	},
	traps_right: {
		path: "M 125 62 Q 138 72 140 88 Q 132 100 112 108 Q 105 100 102 88 Q 108 75 118 65 Q 122 62 125 62",
		muscle: "traps",
	},

	// REAR DELTOIDS
	rear_delt_left: {
		path: "M 50 78 Q 40 88 40 105 Q 45 118 54 122 Q 62 118 60 102 Q 58 88 54 80 Q 52 76 50 78",
		muscle: "shoulders",
	},
	rear_delt_right: {
		path: "M 150 78 Q 160 88 160 105 Q 155 118 146 122 Q 138 118 140 102 Q 142 88 146 80 Q 148 76 150 78",
		muscle: "shoulders",
	},

	// LATS - V-shape back muscles
	lats_left_upper: {
		path: "M 55 95 Q 45 115 45 140 Q 50 160 60 175 Q 72 182 85 176 Q 88 158 85 138 Q 80 115 70 100 Q 62 92 55 95",
		muscle: "lats",
	},
	lats_left_lower: {
		path: "M 60 175 Q 55 195 60 218 Q 68 235 82 240 Q 92 235 95 218 Q 92 195 88 178 Q 78 182 60 175",
		muscle: "lats",
	},
	lats_right_upper: {
		path: "M 145 95 Q 155 115 155 140 Q 150 160 140 175 Q 128 182 115 176 Q 112 158 115 138 Q 120 115 130 100 Q 138 92 145 95",
		muscle: "lats",
	},
	lats_right_lower: {
		path: "M 140 175 Q 145 195 140 218 Q 132 235 118 240 Q 108 235 105 218 Q 108 195 112 178 Q 122 182 140 175",
		muscle: "lats",
	},

	// RHOMBOIDS / MID BACK
	back_left: {
		path: "M 72 105 Q 65 125 68 150 Q 75 168 90 165 Q 95 145 92 125 Q 88 108 80 102 Q 76 102 72 105",
		muscle: "back",
	},
	back_right: {
		path: "M 128 105 Q 135 125 132 150 Q 125 168 110 165 Q 105 145 108 125 Q 112 108 120 102 Q 124 102 128 105",
		muscle: "back",
	},

	// LOWER BACK - Erector Spinae
	lower_back_left: {
		path: "M 78 200 Q 70 225 72 255 Q 78 275 92 280 Q 98 270 98 250 Q 96 225 92 205 Q 86 198 78 200",
		muscle: "lower_back",
	},
	lower_back_right: {
		path: "M 122 200 Q 130 225 128 255 Q 122 275 108 280 Q 102 270 102 250 Q 104 225 108 205 Q 114 198 122 200",
		muscle: "lower_back",
	},

	// TRICEPS - Back of arms
	triceps_left: {
		path: "M 46 105 Q 38 130 38 160 Q 42 190 52 205 Q 62 210 66 198 Q 62 165 58 135 Q 54 115 48 105 Q 46 102 46 105",
		muscle: "triceps",
	},
	triceps_right: {
		path: "M 154 105 Q 162 130 162 160 Q 158 190 148 205 Q 138 210 134 198 Q 138 165 142 135 Q 146 115 152 105 Q 154 102 154 105",
		muscle: "triceps",
	},

	// GLUTES - Gluteus Maximus
	glutes_left: {
		path: "M 65 275 Q 55 300 55 330 Q 62 358 80 368 Q 96 372 100 355 Q 100 325 96 298 Q 88 278 78 272 Q 72 270 65 275",
		muscle: "glutes",
	},
	glutes_right: {
		path: "M 135 275 Q 145 300 145 330 Q 138 358 120 368 Q 104 372 100 355 Q 100 325 104 298 Q 112 278 122 272 Q 128 270 135 275",
		muscle: "glutes",
	},

	// HAMSTRINGS - Back of thighs
	hamstrings_left_outer: {
		path: "M 58 372 Q 50 410 48 455 Q 52 495 68 510 Q 82 505 86 488 Q 82 445 78 400 Q 72 378 65 372 Q 62 370 58 372",
		muscle: "hamstrings",
	},
	hamstrings_left_inner: {
		path: "M 78 375 Q 82 415 86 460 Q 88 495 84 510 Q 96 500 100 475 Q 102 435 98 395 Q 92 375 85 370 Q 82 368 78 375",
		muscle: "hamstrings",
	},
	hamstrings_right_outer: {
		path: "M 142 372 Q 150 410 152 455 Q 148 495 132 510 Q 118 505 114 488 Q 118 445 122 400 Q 128 378 135 372 Q 138 370 142 372",
		muscle: "hamstrings",
	},
	hamstrings_right_inner: {
		path: "M 122 375 Q 118 415 114 460 Q 112 495 116 510 Q 104 500 100 475 Q 98 435 102 395 Q 108 375 115 370 Q 118 368 122 375",
		muscle: "hamstrings",
	},

	// CALVES - Back view
	calves_left: {
		path: "M 52 515 Q 45 555 48 595 Q 55 625 72 635 Q 90 630 94 605 Q 88 560 80 525 Q 70 512 60 512 Q 56 512 52 515",
		muscle: "calves",
	},
	calves_right: {
		path: "M 148 515 Q 155 555 152 595 Q 145 625 128 635 Q 110 630 106 605 Q 112 560 120 525 Q 130 512 140 512 Q 144 512 148 515",
		muscle: "calves",
	},
};

export const FEMALE_BACK_MUSCLES: MusclePathRecord = { ...MALE_BACK_MUSCLES };
