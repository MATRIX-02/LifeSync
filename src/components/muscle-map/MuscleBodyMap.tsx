// MuscleBodyMap Component - Realistic anatomical visualization
// Similar to fitness app muscle maps with dark background and red highlighted muscles

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { MuscleGroup } from "../../types/workout";
import { FEMALE_BACK_MUSCLES, MALE_BACK_MUSCLES } from "./backMuscles";
import { BODY_OUTLINE, MUSCLE_DEFINITION_LINES } from "./bodyOutline";
import { FEMALE_FRONT_MUSCLES, MALE_FRONT_MUSCLES } from "./frontMuscles";
import { MuscleBodyMapProps } from "./types";

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
	// Select appropriate muscle set based on gender and view
	const muscles =
		view === "front"
			? gender === "male"
				? MALE_FRONT_MUSCLES
				: FEMALE_FRONT_MUSCLES
			: gender === "male"
			? MALE_BACK_MUSCLES
			: FEMALE_BACK_MUSCLES;

	// Select appropriate body outline based on gender and view
	const outlineSet = view === "front" ? BODY_OUTLINE.front : BODY_OUTLINE.back;
	const outline = gender === "male" ? outlineSet.male : outlineSet.female;

	const frontDefLines = MUSCLE_DEFINITION_LINES.front;
	const backDefLines = MUSCLE_DEFINITION_LINES.back;

	// Get muscle color based on intensity (like the reference image)
	const getMuscleColor = (
		muscle: MuscleGroup,
		intensity: number = 0
	): string => {
		if (intensity === 0) return "#4A4A4A"; // Dark gray for inactive

		// Use red/pink tones like in the reference image
		const baseColor = "#E74C3C"; // Red base
		const lightColor = "#F1948A"; // Light pink for low intensity

		if (intensity < 30) return lightColor + "80";
		if (intensity < 60) return "#E57373";
		if (intensity < 80) return "#EF5350";
		return baseColor; // Full intensity = bright red
	};

	const getIntensity = (muscle: MuscleGroup): number => {
		return highlightedMuscles[muscle] || 0;
	};

	// Body colors - dark silhouette style
	const bodyColor = "#2D2D2D";
	const outlineColor = "#1A1A1A";
	const definitionLineColor = "#3A3A3A";

	return (
		<View style={[styles.container, { width, height }]}>
			<Svg width={width} height={height} viewBox="0 0 200 680">
				<Defs>
					<LinearGradient id="bodyGradient" x1="0" y1="0" x2="1" y2="1">
						<Stop offset="0%" stopColor="#3D3D3D" />
						<Stop offset="100%" stopColor="#2D2D2D" />
					</LinearGradient>
					<LinearGradient id="muscleHighlight" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
						<Stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
					</LinearGradient>
				</Defs>

				{/* Body Silhouette */}
				<G>
					{/* Head */}
					<Path
						d={outline.head}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="1.5"
					/>

					{/* Neck */}
					<Path
						d={outline.neck}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="0.5"
					/>

					{/* Torso */}
					<Path
						d={outline.torso}
						fill="url(#bodyGradient)"
						stroke={outlineColor}
						strokeWidth="1.5"
					/>

					{/* Arms */}
					<Path
						d={outline.leftArm}
						fill="url(#bodyGradient)"
						stroke={outlineColor}
						strokeWidth="1.5"
					/>
					<Path
						d={outline.rightArm}
						fill="url(#bodyGradient)"
						stroke={outlineColor}
						strokeWidth="1.5"
					/>

					{/* Legs */}
					<Path
						d={outline.leftLeg}
						fill="url(#bodyGradient)"
						stroke={outlineColor}
						strokeWidth="1.5"
					/>
					<Path
						d={outline.rightLeg}
						fill="url(#bodyGradient)"
						stroke={outlineColor}
						strokeWidth="1.5"
					/>

					{/* Hands */}
					<Path
						d={outline.leftHand}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="0.8"
					/>
					<Path
						d={outline.rightHand}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="0.8"
					/>

					{/* Feet */}
					<Path
						d={outline.leftFoot}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="0.8"
					/>
					<Path
						d={outline.rightFoot}
						fill={bodyColor}
						stroke={outlineColor}
						strokeWidth="0.8"
					/>
				</G>

				{/* Muscle Definition Lines - White lines showing muscle boundaries */}
				<G opacity="0.5">
					{view === "front" ? (
						<>
							{/* Chest separation */}
							<Path
								d={frontDefLines.chestSeparation}
								stroke="#FFFFFF"
								strokeWidth="1"
								fill="none"
							/>
							{/* Linea alba */}
							<Path
								d={frontDefLines.lineaAlba}
								stroke="#FFFFFF"
								strokeWidth="1"
								fill="none"
							/>
							{/* Ab horizontal lines */}
							{frontDefLines.abLines?.map((line: string, i: number) => (
								<Path
									key={`ab-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.8"
									fill="none"
								/>
							))}
							{/* V-lines */}
							{frontDefLines.vLine?.map((line: string, i: number) => (
								<Path
									key={`v-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.8"
									fill="none"
								/>
							))}
							{/* Pec lines */}
							{frontDefLines.pecLines?.map((line: string, i: number) => (
								<Path
									key={`pec-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.7"
									fill="none"
								/>
							))}
							{/* Serratus lines */}
							{frontDefLines.serratusLines?.map((line: string, i: number) => (
								<Path
									key={`serratus-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.6"
									fill="none"
								/>
							))}
							{/* Shoulder lines */}
							{frontDefLines.shoulderLines?.map((line: string, i: number) => (
								<Path
									key={`shoulder-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.7"
									fill="none"
								/>
							))}
							{/* Bicep peak lines */}
							{frontDefLines.bicepLines?.map((line: string, i: number) => (
								<Path
									key={`bicep-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.6"
									fill="none"
								/>
							))}
						</>
					) : (
						<>
							{/* Spine */}
							<Path
								d={backDefLines.spine}
								stroke="#FFFFFF"
								strokeWidth="1.2"
								fill="none"
							/>
							{/* Scapula */}
							{backDefLines.scapula?.map((line: string, i: number) => (
								<Path
									key={`scap-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.7"
									fill="none"
								/>
							))}
							{/* Lat V-taper lines */}
							{backDefLines.latLines?.map((line: string, i: number) => (
								<Path
									key={`lat-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.8"
									fill="none"
								/>
							))}
							{/* Lower back/erector spinae */}
							{backDefLines.lowerBackLines?.map((line: string, i: number) => (
								<Path
									key={`lowerback-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.7"
									fill="none"
								/>
							))}
							{/* Glute separation */}
							{backDefLines.gluteLine && (
								<Path
									d={backDefLines.gluteLine}
									stroke="#FFFFFF"
									strokeWidth="1"
									fill="none"
								/>
							)}
							{/* Trapezius lines */}
							{backDefLines.trapLines?.map((line: string, i: number) => (
								<Path
									key={`trap-${i}`}
									d={line}
									stroke="#FFFFFF"
									strokeWidth="0.7"
									fill="none"
								/>
							))}
						</>
					)}
				</G>

				{/* Muscle Groups - The actual muscles */}
				<G>
					{Object.entries(muscles).map(([key, { path, muscle }]) => {
						const intensity = getIntensity(muscle);
						const fillColor = getMuscleColor(muscle, intensity);
						const isActive = intensity > 0;

						return (
							<G key={key}>
								<Path
									d={path}
									fill={fillColor}
									stroke={isActive ? "#C0392B" : "#3A3A3A"}
									strokeWidth={isActive ? 1 : 0.5}
									opacity={isActive ? 0.95 : 0.7}
									onPress={() => onMusclePress?.(muscle)}
								/>
								{/* Highlight overlay for active muscles */}
								{intensity > 50 && (
									<Path d={path} fill="url(#muscleHighlight)" opacity={0.3} />
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
		bottom: 5,
		alignItems: "center",
	},
	viewLabel: {
		fontSize: 11,
		fontWeight: "600",
	},
});

export default MuscleBodyMap;
