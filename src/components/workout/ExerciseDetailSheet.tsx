// Exercise reference sheet - form video/images, instructions and tips

import { Theme } from "@/src/context/themeContext";
import { CustomExercise } from "@/src/context/workoutStoreDB/types";
import { MUSCLE_GROUP_INFO } from "@/src/data/exerciseDatabase";
import { getExerciseImages } from "@/src/data/exerciseImages";
import { getExerciseVideo } from "@/src/data/exerciseVideos";
import { Exercise, MuscleGroup } from "@/src/types/workout";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

// The player sits on react-native-webview, a native module. On a dev build
// made before it was added, importing it throws at module load and takes the
// whole Workout route down with it ("No route named workout"). Load it
// lazily and fall back to the "Watch on YouTube" button instead.
let YoutubePlayer: React.ComponentType<any> | null = null;
try {
	YoutubePlayer = require("react-native-youtube-iframe").default;
} catch (e) {
	console.warn("YouTube player unavailable (rebuild the dev client):", e);
}

// User-created exercises come from the store with looser, partly optional
// fields, so the sheet normalizes rather than requiring a full Exercise.
type DisplayExercise = Exercise | CustomExercise;

interface ExerciseDetailSheetProps<T extends DisplayExercise> {
	exercise: T | null;
	theme: Theme;
	onClose: () => void;
	onAdd?: (exercise: T) => void;
	addLabel?: string;
}

const FRAME_INTERVAL_MS = 1200;

const toArray = (v: string | string[] | undefined): string[] =>
	!v ? [] : Array.isArray(v) ? v : [v];

export default function ExerciseDetailSheet<T extends DisplayExercise>({
	exercise,
	theme,
	onClose,
	onAdd,
	addLabel = "Add to Workout",
}: ExerciseDetailSheetProps<T>) {
	const [frame, setFrame] = useState(0);
	const [isPlaying, setIsPlaying] = useState(true);
	const [imageFailed, setImageFailed] = useState(false);
	const [isImageLoading, setIsImageLoading] = useState(true);
	// Custom exercises and unmatched entries legitimately have no imagery.
	const images = exercise ? getExerciseImages(exercise.id) : [];
	const loadedRef = useRef<Set<string>>(new Set());
	const videoId = exercise ? getExerciseVideo(exercise.id) : undefined;
	// The video replaces the photos; photos are only the fallback when there's
	// no video, the embed fails, or the player isn't in this build.
	const [videoFailed, setVideoFailed] = useState(false);
	const [videoReady, setVideoReady] = useState(false);
	const [mediaWidth, setMediaWidth] = useState(0);
	const hasVideo = !!videoId && !videoFailed && !!YoutubePlayer;

	useEffect(() => {
		setFrame(0);
		setIsPlaying(true);
		setImageFailed(false);
		loadedRef.current = new Set();
		setVideoFailed(false);
		setVideoReady(false);
	}, [exercise?.id]);

	// Alternating the start/end frames reads as motion without shipping video.
	useEffect(() => {
		if (!isPlaying || images.length < 2 || hasVideo) return;
		const id = setInterval(
			() => setFrame((f) => (f + 1) % images.length),
			FRAME_INTERVAL_MS,
		);
		return () => clearInterval(id);
	}, [isPlaying, images.length, hasVideo]);

	useEffect(() => {
		if (images.length === 0) return;
		setIsImageLoading(!loadedRef.current.has(images[frame]));
	}, [frame, images]);

	const styles = createStyles(theme);

	if (!exercise) return null;

	const hasImages = images.length > 0 && !imageFailed;
	const instructions = toArray(exercise.instructions);
	const equipment = toArray(exercise.equipment);
	const tips = exercise.tips ?? [];
	const muscles = exercise.targetMuscles ?? exercise.primaryMuscles;

	return (
		<Modal
			visible={!!exercise}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<TouchableOpacity onPress={onClose} hitSlop={8}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
						<Text style={styles.title} numberOfLines={1}>
							{exercise.name}
						</Text>
						<View style={styles.headerSpacer} />
					</View>

					<ScrollView
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						{hasVideo ? (
							<View
								style={styles.videoFrame}
								onLayout={(e) => setMediaWidth(e.nativeEvent.layout.width)}
							>
								{mediaWidth > 0 && YoutubePlayer && (
									<YoutubePlayer
										height={Math.round((mediaWidth * 9) / 16)}
										width={mediaWidth}
										videoId={videoId}
										play={false}
										onReady={() => setVideoReady(true)}
										onError={() => setVideoFailed(true)}
										initialPlayerParams={{ modestbranding: true, rel: false }}
									/>
								)}
								{!videoReady && (
									<View style={styles.imageLoader}>
										<ActivityIndicator color={theme.primary} />
									</View>
								)}
							</View>
						) : hasImages ? (
							<TouchableOpacity
								activeOpacity={0.9}
								onPress={() => setIsPlaying((p) => !p)}
								style={styles.imageFrame}
							>
								<Image
									source={{ uri: images[frame] }}
									style={styles.image}
									resizeMode="cover"
									onLoadStart={() => {
										if (!loadedRef.current.has(images[frame])) {
											setIsImageLoading(true);
										}
									}}
									onLoad={() => {
										loadedRef.current.add(images[frame]);
										setIsImageLoading(false);
									}}
									onError={() => {
										setImageFailed(true);
										setIsImageLoading(false);
									}}
								/>
								{isImageLoading && (
									<View style={styles.imageLoader}>
										<ActivityIndicator color={theme.primary} />
									</View>
								)}
								{images.length > 1 && (
									<>
										<View style={styles.playBadge}>
											<Ionicons
												name={isPlaying ? "pause" : "play"}
												size={14}
												color="#fff"
											/>
											<Text style={styles.playBadgeText}>
												{frame === 0 ? "Start" : "End"}
											</Text>
										</View>
										<View style={styles.dots}>
											{images.map((uri, i) => (
												<View
													key={uri}
													style={[styles.dot, i === frame && styles.dotActive]}
												/>
											))}
										</View>
									</>
								)}
							</TouchableOpacity>
						) : (
							<View style={[styles.imageFrame, styles.imagePlaceholder]}>
								<Ionicons
									name="barbell-outline"
									size={40}
									color={theme.textMuted}
								/>
								<Text style={styles.placeholderText}>
									No form images available
								</Text>
							</View>
						)}

						<View style={styles.chipRow}>
							{exercise.difficulty ? (
								<View style={styles.chip}>
									<Text style={styles.chipText}>{exercise.difficulty}</Text>
								</View>
							) : null}
							{exercise.category ? (
								<View style={styles.chip}>
									<Text style={styles.chipText}>{exercise.category}</Text>
								</View>
							) : null}
						</View>

						{exercise.description ? (
							<Text style={styles.description}>{exercise.description}</Text>
						) : null}

						<Section title="Target Muscles" theme={theme}>
							<Text style={styles.body}>
								{muscles
									.map((m: MuscleGroup) => MUSCLE_GROUP_INFO[m]?.name || m)
									.join(", ")}
							</Text>
						</Section>

						{equipment.length > 0 && (
							<Section title="Equipment" theme={theme}>
								<Text style={styles.body}>{equipment.join(", ")}</Text>
							</Section>
						)}

						{instructions.length > 0 && (
							<Section title="How to Perform" theme={theme}>
								{instructions.map((step, i) => (
									<View key={step} style={styles.stepRow}>
										<View style={styles.stepNumber}>
											<Text style={styles.stepNumberText}>{i + 1}</Text>
										</View>
										<Text style={styles.stepText}>{step}</Text>
									</View>
								))}
							</Section>
						)}

						{tips.length > 0 && (
							<Section title="Tips" theme={theme}>
								{tips.map((tip) => (
									<View key={tip} style={styles.tipRow}>
										<Ionicons
											name="bulb-outline"
											size={16}
											color={theme.warning}
										/>
										<Text style={styles.tipText}>{tip}</Text>
									</View>
								))}
							</Section>
						)}

						{videoId && (
							<TouchableOpacity
								style={styles.youtubeLink}
								onPress={() =>
									Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
								}
							>
								<Ionicons name="logo-youtube" size={16} color="#FF0000" />
								<Text style={styles.youtubeLinkText}>Watch on YouTube</Text>
							</TouchableOpacity>
						)}

						{(hasVideo || hasImages) && (
							<Text style={styles.attribution}>
								{[
									hasVideo
										? "Video: YouTube (belongs to its creator)"
										: "Images: free-exercise-db (public domain)",
								]
									.filter(Boolean)
									.join(" · ")}
							</Text>
						)}
					</ScrollView>

					{onAdd && (
						<TouchableOpacity
							style={styles.addButton}
							onPress={() => onAdd(exercise)}
						>
							<Ionicons name="add-circle-outline" size={20} color="#fff" />
							<Text style={styles.addButtonText}>{addLabel}</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	);
}

function Section({
	title,
	theme,
	children,
}: {
	title: string;
	theme: Theme;
	children: React.ReactNode;
}) {
	const styles = createStyles(theme);
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{children}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			maxHeight: "90%",
			paddingBottom: 16,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 14,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: theme.border,
		},
		title: {
			flex: 1,
			fontSize: 17,
			fontWeight: "700",
			color: theme.text,
			textAlign: "center",
			marginHorizontal: 12,
		},
		headerSpacer: {
			width: 24,
		},
		scrollContent: {
			padding: 16,
		},
		videoFrame: {
			width: "100%",
			aspectRatio: 16 / 9,
			borderRadius: 14,
			overflow: "hidden",
			backgroundColor: "#000",
		},
		youtubeLink: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			marginTop: 16,
			paddingVertical: 10,
			borderRadius: 12,
			backgroundColor: theme.surface,
		},
		youtubeLinkText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		imageFrame: {
			width: "100%",
			aspectRatio: 4 / 3,
			borderRadius: 14,
			overflow: "hidden",
			backgroundColor: theme.surface,
		},
		image: {
			width: "100%",
			height: "100%",
		},
		imageLoader: {
			...StyleSheet.absoluteFillObject,
			alignItems: "center",
			justifyContent: "center",
		},
		imagePlaceholder: {
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
		},
		placeholderText: {
			color: theme.textMuted,
			fontSize: 13,
		},
		playBadge: {
			position: "absolute",
			top: 10,
			left: 10,
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			backgroundColor: "rgba(0,0,0,0.6)",
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 14,
		},
		playBadgeText: {
			color: "#fff",
			fontSize: 11,
			fontWeight: "600",
		},
		dots: {
			position: "absolute",
			bottom: 10,
			alignSelf: "center",
			flexDirection: "row",
			gap: 6,
		},
		dot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			backgroundColor: "rgba(255,255,255,0.45)",
		},
		dotActive: {
			backgroundColor: "#fff",
			width: 16,
		},
		chipRow: {
			flexDirection: "row",
			gap: 8,
			marginTop: 14,
		},
		chip: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 10,
			paddingVertical: 5,
		},
		chipText: {
			fontSize: 12,
			color: theme.textSecondary,
			textTransform: "capitalize",
		},
		description: {
			marginTop: 12,
			fontSize: 14,
			lineHeight: 20,
			color: theme.textSecondary,
		},
		section: {
			marginTop: 22,
		},
		sectionTitle: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.text,
			textTransform: "uppercase",
			letterSpacing: 0.6,
			marginBottom: 10,
		},
		body: {
			fontSize: 14,
			color: theme.textSecondary,
			textTransform: "capitalize",
		},
		stepRow: {
			flexDirection: "row",
			gap: 10,
			marginBottom: 10,
		},
		stepNumber: {
			width: 22,
			height: 22,
			borderRadius: 11,
			backgroundColor: theme.primary,
			alignItems: "center",
			justifyContent: "center",
		},
		stepNumberText: {
			color: "#fff",
			fontSize: 12,
			fontWeight: "700",
		},
		stepText: {
			flex: 1,
			fontSize: 14,
			lineHeight: 20,
			color: theme.textSecondary,
		},
		tipRow: {
			flexDirection: "row",
			gap: 8,
			alignItems: "flex-start",
			marginBottom: 8,
		},
		tipText: {
			flex: 1,
			fontSize: 14,
			lineHeight: 20,
			color: theme.textSecondary,
		},
		attribution: {
			marginTop: 24,
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "center",
		},
		addButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.primary,
			marginHorizontal: 16,
			marginTop: 8,
			paddingVertical: 15,
			borderRadius: 14,
		},
		addButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
	});
