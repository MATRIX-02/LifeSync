// Body Outline Paths - Anatomically accurate silhouette shapes
// Based on fitness app anatomical diagram style (like the reference image)

export const BODY_OUTLINE = {
	front: {
		// Male Front Body Outline - Matching reference image proportions
		male: {
			// Head
			head: "M 100 10 Q 85 10 80 25 Q 78 40 82 50 L 88 58 L 112 58 L 118 50 Q 122 40 120 25 Q 115 10 100 10 Z",
			// Neck
			neck: "M 88 58 L 85 70 L 82 85 L 118 85 L 115 70 L 112 58",
			// Torso - Athletic V-shape
			torso: `M 45 85 
				L 35 95 
				L 30 115 
				L 28 145 
				L 30 180 
				L 35 220 
				L 42 260 
				L 52 290 
				L 68 305 
				L 85 310 
				L 100 311 
				L 115 310 
				L 132 305 
				L 148 290 
				L 158 260 
				L 165 220 
				L 170 180 
				L 172 145 
				L 170 115 
				L 165 95 
				L 155 85 Z`,
			// Left Arm
			leftArm: `M 30 95 
				L 20 115 
				L 15 150 
				L 15 190 
				L 18 235 
				L 24 280 
				L 28 320 
				L 28 355 
				L 50 358 
				L 52 320 
				L 48 275 
				L 45 230 
				L 45 185 
				L 48 140 
				L 52 110 
				L 48 95 Z`,
			// Right Arm
			rightArm: `M 170 95 
				L 180 115 
				L 185 150 
				L 185 190 
				L 182 235 
				L 176 280 
				L 172 320 
				L 172 355 
				L 150 358 
				L 148 320 
				L 152 275 
				L 155 230 
				L 155 185 
				L 152 140 
				L 148 110 
				L 152 95 Z`,
			// Left Leg
			leftLeg: `M 68 305 
				L 55 330 
				L 48 370 
				L 45 420 
				L 45 480 
				L 48 540 
				L 52 590 
				L 58 630 
				L 60 665 
				L 95 668 
				L 98 630 
				L 95 580 
				L 93 520 
				L 93 460 
				L 95 400 
				L 98 350 
				L 95 315 Z`,
			// Right Leg
			rightLeg: `M 132 305 
				L 145 330 
				L 152 370 
				L 155 420 
				L 155 480 
				L 152 540 
				L 148 590 
				L 142 630 
				L 140 665 
				L 105 668 
				L 102 630 
				L 105 580 
				L 107 520 
				L 107 460 
				L 105 400 
				L 102 350 
				L 105 315 Z`,
			// Left Hand
			leftHand: "M 26 355 L 18 368 Q 15 380 22 390 Q 32 398 45 392 L 50 358 Z",
			// Right Hand
			rightHand:
				"M 174 355 L 182 368 Q 185 380 178 390 Q 168 398 155 392 L 150 358 Z",
			// Left Foot
			leftFoot: "M 58 665 L 52 680 Q 48 692 58 698 Q 75 702 90 696 L 95 668 Z",
			// Right Foot
			rightFoot:
				"M 142 665 L 148 680 Q 152 692 142 698 Q 125 702 110 696 L 105 668 Z",
		},
		// Female Front Body Outline
		female: {
			// Head - Rounder, more feminine
			head: "M 100 8 Q 128 8 132 38 Q 132 60 118 70 L 82 70 Q 68 60 68 38 Q 72 8 100 8",
			// Neck - Slender
			neck: "M 86 70 Q 84 80 86 92 L 114 92 Q 116 80 114 70",
			// Torso - Hourglass shape with curves
			torso: `M 52 92 
				Q 44 102 44 135 
				Q 46 175 55 210 
				Q 60 245 65 275 
				Q 75 300 100 305 
				Q 125 300 135 275 
				Q 140 245 145 210 
				Q 154 175 156 135 
				Q 156 102 148 92 
				Q 130 88 100 88 
				Q 70 88 52 92`,
			// Left Arm - Slender
			leftArm: `M 44 98 
				Q 34 125 34 175 
				Q 36 235 42 295 
				Q 44 335 42 370 
				L 62 373 
				Q 68 335 64 285 
				Q 60 225 62 165 
				Q 64 120 55 100`,
			// Right Arm
			rightArm: `M 156 98 
				Q 166 125 166 175 
				Q 164 235 158 295 
				Q 156 335 158 370 
				L 138 373 
				Q 132 335 136 285 
				Q 140 225 138 165 
				Q 136 120 145 100`,
			// Left Leg - Feminine curves
			leftLeg: `M 65 290 
				Q 52 345 50 440 
				Q 52 545 60 640 
				Q 62 680 58 715 
				L 96 715 
				Q 100 680 98 630 
				Q 96 540 98 445 
				Q 100 350 94 295`,
			// Right Leg
			rightLeg: `M 135 290 
				Q 148 345 150 440 
				Q 148 545 140 640 
				Q 138 680 142 715 
				L 104 715 
				Q 100 680 102 630 
				Q 104 540 102 445 
				Q 100 350 106 295`,
			// Hands
			leftHand: "M 36 370 Q 28 385 34 405 Q 46 420 62 410 Q 68 395 65 380",
			rightHand:
				"M 164 370 Q 172 385 166 405 Q 154 420 138 410 Q 132 395 135 380",
			// Feet
			leftFoot: "M 55 715 Q 48 735 62 745 Q 82 752 96 742 Q 102 728 98 715",
			rightFoot:
				"M 145 715 Q 152 735 138 745 Q 118 752 104 742 Q 98 728 102 715",
		},
	},
	back: {
		// Male Back Body Outline
		male: {
			// Head - Back of head
			head: "M 100 5 Q 130 5 135 35 Q 135 58 122 68 L 78 68 Q 65 58 65 35 Q 70 5 100 5",
			// Neck with trapezius taper
			neck: "M 82 68 Q 75 78 72 92 L 128 92 Q 125 78 118 68",
			// Torso - V-shaped with lats
			torso: `M 45 92 
				Q 35 105 35 145 
				Q 38 200 48 260 
				Q 55 300 68 325 
				Q 85 345 100 348 
				Q 115 345 132 325 
				Q 145 300 152 260 
				Q 162 200 165 145 
				Q 165 105 155 92 
				Q 135 88 100 88 
				Q 65 88 45 92`,
			// Left Arm
			leftArm: `M 38 98 
				Q 28 125 28 180 
				Q 30 245 38 310 
				Q 42 355 40 395 
				L 62 398 
				Q 68 360 64 305 
				Q 58 240 60 175 
				Q 62 125 50 100`,
			// Right Arm
			rightArm: `M 162 98 
				Q 172 125 172 180 
				Q 170 245 162 310 
				Q 158 355 160 395 
				L 138 398 
				Q 132 360 136 305 
				Q 142 240 140 175 
				Q 138 125 150 100`,
			// Left Leg
			leftLeg: `M 68 340 
				Q 52 405 50 510 
				Q 52 620 62 720 
				Q 64 765 58 810 
				L 98 810 
				Q 102 770 100 710 
				Q 98 605 100 505 
				Q 102 405 94 345`,
			// Right Leg
			rightLeg: `M 132 340 
				Q 148 405 150 510 
				Q 148 620 138 720 
				Q 136 765 142 810 
				L 102 810 
				Q 98 770 100 710 
				Q 102 605 100 505 
				Q 98 405 106 345`,
			// Hands
			leftHand: "M 34 395 Q 26 412 32 432 Q 45 448 62 438 Q 68 422 65 405",
			rightHand:
				"M 166 395 Q 174 412 168 432 Q 155 448 138 438 Q 132 422 135 405",
			// Feet
			leftFoot: "M 55 810 Q 48 830 62 842 Q 82 850 98 840 Q 104 825 100 810",
			rightFoot:
				"M 145 810 Q 152 830 138 842 Q 118 850 102 840 Q 96 825 100 810",
		},
		// Female Back Body Outline
		female: {
			// Head
			head: "M 100 8 Q 128 8 132 38 Q 132 60 118 70 L 82 70 Q 68 60 68 38 Q 72 8 100 8",
			// Neck
			neck: "M 86 70 Q 80 80 78 95 L 122 95 Q 120 80 114 70",
			// Torso - Hourglass from back
			torso: `M 52 95 
				Q 44 110 46 155 
				Q 50 210 58 270 
				Q 64 310 74 340 
				Q 88 365 100 368 
				Q 112 365 126 340 
				Q 136 310 142 270 
				Q 150 210 154 155 
				Q 156 110 148 95 
				Q 130 90 100 90 
				Q 70 90 52 95`,
			// Left Arm
			leftArm: `M 46 100 
				Q 36 130 36 185 
				Q 40 255 48 325 
				Q 52 375 50 415 
				L 72 418 
				Q 78 380 74 320 
				Q 68 250 70 180 
				Q 72 130 58 105`,
			// Right Arm
			rightArm: `M 154 100 
				Q 164 130 164 185 
				Q 160 255 152 325 
				Q 148 375 150 415 
				L 128 418 
				Q 122 380 126 320 
				Q 132 250 130 180 
				Q 128 130 142 105`,
			// Left Leg
			leftLeg: `M 72 360 
				Q 56 425 54 535 
				Q 58 655 68 760 
				Q 70 805 64 850 
				L 102 850 
				Q 106 810 104 750 
				Q 102 645 104 540 
				Q 106 430 98 365`,
			// Right Leg
			rightLeg: `M 128 360 
				Q 144 425 146 535 
				Q 142 655 132 760 
				Q 130 805 136 850 
				L 98 850 
				Q 94 810 96 750 
				Q 98 645 96 540 
				Q 94 430 102 365`,
			// Hands
			leftHand: "M 44 415 Q 36 432 42 452 Q 55 468 72 458 Q 78 442 75 425",
			rightHand:
				"M 156 415 Q 164 432 158 452 Q 145 468 128 458 Q 122 442 125 425",
			// Feet
			leftFoot: "M 61 850 Q 54 870 68 882 Q 88 890 104 880 Q 110 865 106 850",
			rightFoot: "M 139 850 Q 146 870 132 882 Q 112 890 96 880 Q 90 865 94 850",
		},
	},
};

// Muscle definition line hints for realism - fine anatomical lines matching reference image
export const MUSCLE_DEFINITION_LINES = {
	front: {
		// Chest separation (sternum line)
		chestSeparation: "M 100 85 L 100 190",
		// Ab definition lines (horizontal separations between ab segments)
		abLines: [
			"M 85 210 L 115 210", // Between abs 1-2
			"M 84 240 L 116 240", // Between abs 2-3
			"M 83 272 L 117 272", // Between abs 3-4
		],
		// Linea alba (center line of abs)
		lineaAlba: "M 100 190 L 100 305",
		// V-lines (Adonis belt / inguinal ligament)
		vLine: ["M 82 290 L 90 305 L 98 312", "M 118 290 L 110 305 L 102 312"],
		// Pec definition (lower edge of pecs)
		pecLines: ["M 70 130 Q 85 138 100 140", "M 130 130 Q 115 138 100 140"],
		// Serratus (side ribs) - finger-like projections
		serratusLines: [
			"M 65 170 L 72 165 L 78 168",
			"M 63 185 L 70 180 L 76 183",
			"M 62 200 L 69 195 L 74 198",
			"M 135 170 L 128 165 L 122 168",
			"M 137 185 L 130 180 L 124 183",
			"M 138 200 L 131 195 L 126 198",
		],
		// Shoulder definition
		shoulderLines: ["M 68 100 Q 55 115 48 140", "M 132 100 Q 145 115 152 140"],
		// Bicep peak line
		bicepLines: ["M 55 180 Q 58 195 60 215", "M 145 180 Q 142 195 140 215"],
	},
	back: {
		// Spine
		spine: "M 100 60 L 100 340",
		// Scapula (shoulder blade) outlines - both sides
		scapula: [
			// Left scapula
			"M 75 105 Q 65 115 62 135 L 70 155 Q 78 165 88 165",
			"M 85 100 L 78 125 L 75 148",
			// Right scapula
			"M 125 105 Q 135 115 138 135 L 130 155 Q 122 165 112 165",
			"M 115 100 L 122 125 L 125 148",
		],
		// Lat definition (V-taper lines)
		latLines: [
			"M 68 145 Q 55 180 50 230 L 58 280",
			"M 132 145 Q 145 180 150 230 L 142 280",
		],
		// Lower back definition (erector spinae columns)
		lowerBackLines: [
			"M 88 215 L 90 260 L 92 300",
			"M 112 215 L 110 260 L 108 300",
		],
		// Glute separation
		gluteLine: "M 100 305 L 100 360",
		// Trapezius lines
		trapLines: ["M 88 70 Q 75 85 68 108", "M 112 70 Q 125 85 132 108"],
	},
};
