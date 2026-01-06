// MuscleBodyMap Component - Realistic anatomical visualization
// Following react-native-body-highlighter pattern for flexibility
// Similar to fitness app muscle maps with dark background and red highlighted muscles

import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { MuscleGroup } from "../../types/workout";
import { bodyFemaleBack } from "./assets/bodyFemaleBack";
import { bodyFemaleFront } from "./assets/bodyFemaleFront";
import { MALE_BACK_BODY } from "./assets/maleBack";
import { MALE_FRONT_BODY } from "./assets/maleFront";
import { SvgFemaleWrapper } from "./SvgFemaleWrapper";
import { SvgMaleWrapper } from "./SvgMaleWrapper";
import { BodyPart, ExtendedBodyPart, MuscleBodyMapProps } from "./types";

const MuscleBodyMap: React.FC<MuscleBodyMapProps> = ({
	gender = "male",
	view = "front",
	data = [],
	highlightedMuscles,
	colors = ["#4CAF50", "#8BC34A", "#FF9800", "#E91E63", "#9C27B0"], // Green to purple gradient for intensity
	defaultFill = "#4A4A4A",
	defaultStroke = "#3A3A3A",
	defaultStrokeWidth = 0.5,
	onMusclePress,
	disabledMuscles = [],
	hiddenMuscles = [],
	width = 200,
	height = 520,
	showLabels = false,
	border = "#1A1A1A",
	scale = 1,
	theme,
}) => {
	// Convert legacy highlightedMuscles to new data format
	const convertedData = useMemo<ReadonlyArray<ExtendedBodyPart>>(() => {
		if (!highlightedMuscles || Object.keys(highlightedMuscles).length === 0) {
			return data;
		}

		// Convert highlightedMuscles object to ExtendedBodyPart array
		const converted = Object.entries(highlightedMuscles).map(
			([muscle, intensity]): ExtendedBodyPart => ({
				slug: muscle as MuscleGroup,
				intensity: intensity || 0,
			})
		);

		// Merge with existing data prop
		return [...converted, ...data];
	}, [data, highlightedMuscles]);

	// Select appropriate muscle asset set based on gender and view
	const muscleAssets = useMemo<ReadonlyArray<BodyPart>>(() => {
		if (gender === "female") {
			return view === "back" ? bodyFemaleBack : bodyFemaleFront;
		}
		// Default to male assets
		return view === "back" ? MALE_BACK_BODY : MALE_FRONT_BODY;
	}, [gender, view]);

	// Merge asset data (paths) with user data (styles, intensity, colors)
	const mergedMuscles = useMemo<ReadonlyArray<ExtendedBodyPart>>(() => {
		// Filter out hidden muscles
		const visibleAssets = muscleAssets.filter(
			(asset) =>
				!hiddenMuscles.some(
					(d) => d === asset.slug || d === String(asset.slug).replace(/-/g, "_")
				)
		);

		// Muscle name aliases to map MuscleGroup types to asset slugs
		const muscleAliases: Record<string, string[]> = {
			traps: ["trapezius"],
			trapezius: ["traps"],
			glutes: ["gluteal"],
			gluteal: ["glutes"],
			lats: ["upper-back", "upper_back"],
			"upper-back": ["lats", "back"],
			upper_back: ["lats", "back"],
			back: ["upper-back", "upper_back", "lats"],
			shoulders: ["deltoids"],
			deltoids: ["shoulders"],
			forearms: ["forearm"],
			forearm: ["forearms"],
			hamstrings: ["hamstring"],
			hamstring: ["hamstrings"],
			lower_back: ["lower-back"],
			"lower-back": ["lower_back"],
		};

		// Create lookup map for user data (use string keys and insert common
		// slug variants so asset slugs like "upper-back" match data keys like
		// "upper_back" or plural/singular forms).
		const userDataMap = new Map<string, ExtendedBodyPart>();
		convertedData.forEach((userPart) => {
			if (userPart.slug) {
				const keyOriginal = String(userPart.slug);
				const keyHyphen = keyOriginal.replace(/_/g, "-");
				const keySingular = keyOriginal.endsWith("s")
					? keyOriginal.slice(0, -1)
					: null;
				const keySingularHyphen = keySingular
					? keySingular.replace(/_/g, "-")
					: null;

				const keys = [keyOriginal, keyHyphen];
				if (keySingular) keys.push(keySingular);
				if (keySingularHyphen) keys.push(keySingularHyphen);

				// Add aliases for muscle name variations
				const aliases = muscleAliases[keyOriginal] || [];
				keys.push(...aliases);

				keys.forEach((k) => {
					const existing = userDataMap.get(k);
					if (existing) {
						userDataMap.set(k, { ...existing, ...userPart });
					} else {
						userDataMap.set(k, userPart);
					}
				});
			}
		});

		// Merge asset paths with user styling/intensity
		return visibleAssets.map((asset): ExtendedBodyPart => {
			// Try direct match first; userDataMap contains common variants
			const userData =
				userDataMap.get(asset.slug) ||
				userDataMap.get(asset.slug.replace(/-/g, "_"));

			if (!userData) {
				// No user data, return asset as-is
				return asset;
			}

			// Merge: asset has paths, userData has styles/colors/intensity
			return {
				...asset,
				...userData,
				// Preserve asset paths
				path: asset.path,
			};
		});
	}, [muscleAssets, convertedData, hiddenMuscles]);

	// Get styling for a body part (follows react-native-body-highlighter priority)
	const getPartStyles = useCallback(
		(bodyPart: ExtendedBodyPart) => {
			return {
				fill: bodyPart.styles?.fill ?? defaultFill,
				stroke: bodyPart.styles?.stroke ?? defaultStroke,
				strokeWidth: bodyPart.styles?.strokeWidth ?? defaultStrokeWidth,
			};
		},
		[defaultFill, defaultStroke, defaultStrokeWidth]
	);

	// Get fill color with priority: styles.fill > color > intensity > disabled > default
	const getColorToFill = useCallback(
		(bodyPart: ExtendedBodyPart): string => {
			// Disabled muscles (check common slug variants)
			if (
				disabledMuscles.some(
					(d) =>
						d === bodyPart.slug ||
						d === String(bodyPart.slug).replace(/-/g, "_")
				)
			) {
				return "#EBEBE4";
			}

			// Priority 1: Per-part styles.fill
			if (bodyPart.styles?.fill) {
				return bodyPart.styles.fill;
			}

			// Priority 2: Intensity-based color (so highlights override asset color)
			if (bodyPart.intensity && bodyPart.intensity > 0) {
				// Smooth interpolation between colors based on intensity 0-100
				if (bodyPart.intensity <= 100) {
					// Use smooth color selection based on intensity percentage
					const normalizedIntensity = bodyPart.intensity / 100;
					const index = Math.floor(normalizedIntensity * (colors.length - 1));
					const nextIndex = Math.min(index + 1, colors.length - 1);

					// For intensities at exact breakpoints, return the color directly
					// Otherwise blend between colors for smoother transitions
					if (index === nextIndex || normalizedIntensity === 1) {
						return colors[nextIndex] || defaultFill;
					}

					// Simple discrete color selection based on intensity ranges
					// 0-25%: first color, 25-50%: second, 50-75%: third, 75-100%: fourth
					return colors[index] || defaultFill;
				}
				// If intensity is 1-based index
				return colors[bodyPart.intensity - 1] || defaultFill;
			}

			// Priority 3: Direct color prop from asset
			if (bodyPart.color) {
				return bodyPart.color;
			}

			// Priority 4: Default fill
			return defaultFill;
		},
		[colors, defaultFill, disabledMuscles]
	);

	// Check if muscle is active (has intensity > 0)
	const isActive = useCallback((bodyPart: ExtendedBodyPart): boolean => {
		return (bodyPart.intensity || 0) > 0;
	}, []);

	// Check if muscle is disabled (accepts string slugs and checks common variants)
	const isDisabled = useCallback(
		(slug: string): boolean => {
			return disabledMuscles.some(
				(d) =>
					d === slug ||
					d === String(slug).replace(/-/g, "_") ||
					d === String(slug).replace(/_/g, "-")
			);
		},
		[disabledMuscles]
	);

	// Handle press with side support
	const handlePress = useCallback(
		(bodyPart: ExtendedBodyPart, side?: "left" | "right") => {
			if (isDisabled(bodyPart.slug)) return;
			onMusclePress?.(bodyPart, side);
		},
		[onMusclePress, isDisabled]
	);

	// `SvgMaleWrapper` and `SvgFemaleWrapper` provide the body outline/border.
	// We no longer use the older `BODY_OUTLINE` or `MUSCLE_DEFINITION_LINES` sources.

	// Choose the appropriate SVG wrapper based on gender
	const SvgWrapper = gender === "female" ? SvgFemaleWrapper : SvgMaleWrapper;

	return (
		<View
			style={[
				styles.container,
				{ width: width * scale, height: height * scale },
			]}
		>
			<SvgWrapper scale={scale} side={view} gender={gender} border={border}>
				<Defs>
					<LinearGradient id="bodyGradient" x1="0" y1="0" x2="1" y2="1">
						<Stop offset="0%" stopColor="#3D3D3D" />
						<Stop offset="100%" stopColor="#2D2D2D" />
					</LinearGradient>
					<LinearGradient id="muscleHighlight" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0%" stopColor="#ffffffff" stopOpacity="0.15" />
						<Stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
					</LinearGradient>
				</Defs>

				{/* Body outline provided by SvgMaleWrapper; muscle paths follow below. */}
				{mergedMuscles.map((bodyPart, index) => {
					const partStyles = getPartStyles(bodyPart);
					const fillColor = getColorToFill(bodyPart);
					const active = isActive(bodyPart);
					const disabled = isDisabled(bodyPart.slug);

					// Render common paths (not side-specific)
					const commonPaths = (bodyPart.path?.common || []).map(
						(path, pathIndex) => (
							<Path
								key={`${bodyPart.slug}-common-${pathIndex}`}
								d={path}
								fill={fillColor}
								stroke={active ? "#7B1FA2" : partStyles.stroke}
								strokeWidth={active ? 1 : partStyles.strokeWidth}
								opacity={active ? 0.95 : 0.7}
								onPress={disabled ? undefined : () => handlePress(bodyPart)}
							/>
						)
					);

					// Render left paths
					const leftPaths = (bodyPart.path?.left || []).map(
						(path, pathIndex) => {
							// If side is specified as "right", don't highlight left
							const isOnlyRight = bodyPart.side === "right";
							const leftFill = isOnlyRight ? defaultFill : fillColor;

							return (
								<Path
									key={`${bodyPart.slug}-left-${pathIndex}`}
									d={path}
									fill={leftFill}
									stroke={
										active && !isOnlyRight ? "#C0392B" : partStyles.stroke
									}
									strokeWidth={
										active && !isOnlyRight ? 1 : partStyles.strokeWidth
									}
									opacity={active && !isOnlyRight ? 0.95 : 0.7}
									onPress={
										disabled ? undefined : () => handlePress(bodyPart, "left")
									}
								/>
							);
						}
					);

					// Render right paths
					const rightPaths = (bodyPart.path?.right || []).map(
						(path, pathIndex) => {
							// If side is specified as "left", don't highlight right
							const isOnlyLeft = bodyPart.side === "left";
							const rightFill = isOnlyLeft ? defaultFill : fillColor;

							return (
								<Path
									key={`${bodyPart.slug}-right-${pathIndex}`}
									d={path}
									fill={rightFill}
									stroke={active && !isOnlyLeft ? "#7B1FA2" : partStyles.stroke}
									strokeWidth={
										active && !isOnlyLeft ? 1 : partStyles.strokeWidth
									}
									opacity={active && !isOnlyLeft ? 0.95 : 0.7}
									onPress={
										disabled ? undefined : () => handlePress(bodyPart, "right")
									}
								/>
							);
						}
					);

					// Highlight overlay for very active muscles
					const highlightOverlay =
						active && (bodyPart.intensity || 0) > 50 ? (
							<>
								{(bodyPart.path?.common || []).map((path, pathIndex) => (
									<Path
										key={`${bodyPart.slug}-highlight-common-${pathIndex}`}
										d={path}
										fill="url(#muscleHighlight)"
										opacity={0.3}
									/>
								))}
								{(bodyPart.path?.left || []).map((path, pathIndex) =>
									bodyPart.side !== "right" ? (
										<Path
											key={`${bodyPart.slug}-highlight-left-${pathIndex}`}
											d={path}
											fill="url(#muscleHighlight)"
											opacity={0.3}
										/>
									) : null
								)}
								{(bodyPart.path?.right || []).map((path, pathIndex) =>
									bodyPart.side !== "left" ? (
										<Path
											key={`${bodyPart.slug}-highlight-right-${pathIndex}`}
											d={path}
											fill="url(#muscleHighlight)"
											opacity={0.3}
										/>
									) : null
								)}
							</>
						) : null;

					return (
						<G key={`${bodyPart.slug}-${index}`}>
							{commonPaths}
							{leftPaths}
							{rightPaths}
							{highlightOverlay}
						</G>
					);
				})}
			</SvgWrapper>

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
