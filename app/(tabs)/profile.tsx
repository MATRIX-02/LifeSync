import React, { useState, useEffect, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	StatusBar,
	Alert,
	Image,
	ActionSheetIOS,
	Platform,
	Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, useColors, Theme } from "@/src/context/themeContext";
import { useHabitStore } from "@/src/context/habitStore";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { UserProfile } from "@/src/types";
import {
	Gender,
	FitnessLevel,
	FitnessGoal,
	FitnessProfile,
	MuscleGroup,
} from "@/src/types/workout";
import MuscleBodyMap from "@/src/components/MuscleBodyMap";
import { MUSCLE_GROUP_INFO } from "@/src/data/exerciseDatabase";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ from?: string }>();
	const { isDark } = useTheme();
	const theme = useColors();
	const {
		profile,
		setProfile,
		updateProfile,
		getActiveHabits,
		getOverallStats,
	} = useHabitStore();
	const {
		fitnessProfile,
		setFitnessProfile,
		updateFitnessProfile,
		getWorkoutStats,
		workoutSessions,
	} = useWorkoutStore();
	const styles = createStyles(theme);

	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState(profile?.name || "");
	const [email, setEmail] = useState(profile?.email || "");
	const [bio, setBio] = useState(profile?.bio || "");
	const [avatar, setAvatar] = useState<string | undefined>(profile?.avatar);
	const [activeTab, setActiveTab] = useState<"profile" | "fitness">("profile");

	// Fitness profile state
	const [gender, setGender] = useState<Gender>(
		fitnessProfile?.gender || "male"
	);
	const [height, setHeight] = useState(
		fitnessProfile?.height?.toString() || ""
	);
	const [weight, setWeight] = useState(
		fitnessProfile?.weight?.toString() || ""
	);
	const [age, setAge] = useState(fitnessProfile?.age?.toString() || "");
	const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(
		fitnessProfile?.fitnessLevel || "beginner"
	);
	const [fitnessGoals, setFitnessGoals] = useState<FitnessGoal[]>(
		fitnessProfile?.goals || []
	);
	const [weeklyGoal, setWeeklyGoal] = useState(
		fitnessProfile?.weeklyWorkoutGoal?.toString() || "3"
	);

	const habits = getActiveHabits();
	const stats = getOverallStats();
	const workoutStats = getWorkoutStats();

	const [bodyView, setBodyView] = useState<"front" | "back">("front");
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(
		null
	);

	// Calculate muscle activity from workout data
	const muscleActivity = useMemo((): Record<MuscleGroup, number> => {
		const activity: Record<MuscleGroup, number> = {
			chest: 0,
			back: 0,
			shoulders: 0,
			biceps: 0,
			triceps: 0,
			forearms: 0,
			abs: 0,
			obliques: 0,
			quadriceps: 0,
			hamstrings: 0,
			glutes: 0,
			calves: 0,
			traps: 0,
			lats: 0,
			lower_back: 0,
		};

		// Get all completed sessions
		const completedSessions = workoutSessions.filter((s) => s.isCompleted);

		// Count sets per muscle group
		const muscleSets: Record<MuscleGroup, number> = { ...activity };
		let maxSets = 0;

		completedSessions.forEach((session) => {
			session.exercises.forEach((exercise) => {
				const completedSets = exercise.sets.filter((s) => s.completed).length;
				exercise.targetMuscles.forEach((muscle) => {
					muscleSets[muscle] = (muscleSets[muscle] || 0) + completedSets;
					if (muscleSets[muscle] > maxSets) maxSets = muscleSets[muscle];
				});
			});
		});

		// Normalize to 0-100 scale
		if (maxSets > 0) {
			Object.keys(muscleSets).forEach((muscle) => {
				activity[muscle as MuscleGroup] = Math.round(
					(muscleSets[muscle as MuscleGroup] / maxSets) * 100
				);
			});
		}

		return activity;
	}, [workoutSessions]);

	const handleMusclePress = (muscle: MuscleGroup) => {
		setSelectedMuscle(muscle === selectedMuscle ? null : muscle);
	};

	useEffect(() => {
		if (profile) {
			setName(profile.name);
			setEmail(profile.email || "");
			setBio(profile.bio || "");
			setAvatar(profile.avatar);
		}
	}, [profile]);

	useEffect(() => {
		if (fitnessProfile) {
			setGender(fitnessProfile.gender);
			setHeight(fitnessProfile.height?.toString() || "");
			setWeight(fitnessProfile.weight?.toString() || "");
			setAge(fitnessProfile.age?.toString() || "");
			setFitnessLevel(fitnessProfile.fitnessLevel);
			setFitnessGoals(fitnessProfile.goals);
			setWeeklyGoal(fitnessProfile.weeklyWorkoutGoal?.toString() || "3");
		}
	}, [fitnessProfile]);

	const pickImage = async () => {
		// Request permission
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Required",
				"Please allow access to your photo library to set a profile picture."
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: "images",
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.5,
		});

		if (!result.canceled && result.assets[0]) {
			setAvatar(result.assets[0].uri);
		}
	};

	const takePhoto = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Required",
				"Please allow access to your camera to take a profile picture."
			);
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.5,
		});

		if (!result.canceled && result.assets[0]) {
			setAvatar(result.assets[0].uri);
		}
	};

	const handleAvatarPress = () => {
		if (!isEditing) return;

		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: [
						"Cancel",
						"Take Photo",
						"Choose from Library",
						"Remove Photo",
					],
					cancelButtonIndex: 0,
					destructiveButtonIndex: 3,
				},
				(buttonIndex) => {
					if (buttonIndex === 1) takePhoto();
					else if (buttonIndex === 2) pickImage();
					else if (buttonIndex === 3) setAvatar(undefined);
				}
			);
		} else {
			Alert.alert("Profile Photo", "Choose an option", [
				{ text: "Cancel", style: "cancel" },
				{ text: "Take Photo", onPress: takePhoto },
				{ text: "Choose from Library", onPress: pickImage },
				{
					text: "Remove Photo",
					style: "destructive",
					onPress: () => setAvatar(undefined),
				},
			]);
		}
	};

	const handleSave = () => {
		if (!name.trim()) {
			Alert.alert("Error", "Please enter your name");
			return;
		}

		const updatedProfile: UserProfile = {
			id: profile?.id || `profile_${Date.now()}`,
			name: name.trim(),
			email: email.trim() || undefined,
			bio: bio.trim() || undefined,
			avatar: avatar,
			createdAt: profile?.createdAt || new Date(),
			updatedAt: new Date(),
		};

		if (profile) {
			updateProfile(updatedProfile);
		} else {
			setProfile(updatedProfile);
		}

		setIsEditing(false);
		Alert.alert("Success", "Profile updated successfully!");
	};

	const handleSaveFitness = () => {
		const fitnessData: FitnessProfile = {
			gender,
			height: parseFloat(height) || 170,
			weight: parseFloat(weight) || 70,
			age: parseInt(age) || 25,
			fitnessLevel,
			goals: fitnessGoals,
			weeklyWorkoutGoal: parseInt(weeklyGoal) || 3,
			weightUnit: "kg",
			distanceUnit: "km",
		};

		if (fitnessProfile) {
			updateFitnessProfile(fitnessData);
		} else {
			setFitnessProfile(fitnessData);
		}
		setIsEditing(false);
		Alert.alert("Success", "Fitness profile updated!");
	};

	const toggleFitnessGoal = (goal: FitnessGoal) => {
		if (fitnessGoals.includes(goal)) {
			setFitnessGoals(fitnessGoals.filter((g) => g !== goal));
		} else {
			setFitnessGoals([...fitnessGoals, goal]);
		}
	};

	const getBMI = () => {
		if (!height || !weight) return null;
		const h = parseFloat(height) / 100;
		const w = parseFloat(weight);
		return (w / (h * h)).toFixed(1);
	};

	const getBMICategory = (bmi: number) => {
		if (bmi < 18.5) return { text: "Underweight", color: theme.warning };
		if (bmi < 25) return { text: "Normal", color: theme.success };
		if (bmi < 30) return { text: "Overweight", color: theme.warning };
		return { text: "Obese", color: theme.error };
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getMemberSince = () => {
		if (profile?.createdAt) {
			return new Date(profile.createdAt).toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
		}
		return "Just now";
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => {
						if (params.from === "workout") {
							router.replace("/(tabs)/workout" as any);
						} else if (params.from === "finance") {
							router.replace("/(tabs)/finance" as any);
						} else {
							router.replace("/(tabs)/" as any);
						}
					}}
				>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Profile</Text>
				<TouchableOpacity
					style={styles.editButton}
					onPress={() => {
						if (isEditing) {
							activeTab === "profile" ? handleSave() : handleSaveFitness();
						} else {
							setIsEditing(true);
						}
					}}
				>
					<Text style={styles.editButtonText}>
						{isEditing ? "Save" : "Edit"}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Tab Selector */}
			<View style={styles.tabContainer}>
				<TouchableOpacity
					style={[styles.tab, activeTab === "profile" && styles.tabActive]}
					onPress={() => {
						setActiveTab("profile");
						setIsEditing(false);
					}}
				>
					<Ionicons
						name="person"
						size={18}
						color={activeTab === "profile" ? theme.primary : theme.textMuted}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === "profile" && styles.tabTextActive,
						]}
					>
						Profile
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tab, activeTab === "fitness" && styles.tabActive]}
					onPress={() => {
						setActiveTab("fitness");
						setIsEditing(false);
					}}
				>
					<Ionicons
						name="fitness"
						size={18}
						color={activeTab === "fitness" ? theme.primary : theme.textMuted}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === "fitness" && styles.tabTextActive,
						]}
					>
						Fitness
					</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{activeTab === "profile" ? (
					<>
						{/* Profile Avatar Section */}
						<View style={styles.avatarSection}>
							<TouchableOpacity
								style={styles.avatarContainer}
								onPress={handleAvatarPress}
								activeOpacity={isEditing ? 0.7 : 1}
							>
								{avatar ? (
									<Image source={{ uri: avatar }} style={styles.avatar} />
								) : (
									<View
										style={[
											styles.avatarPlaceholder,
											{ backgroundColor: theme.primary },
										]}
									>
										<Text style={styles.avatarInitials}>
											{getInitials(name || "User")}
										</Text>
									</View>
								)}
								{isEditing && (
									<View style={styles.cameraButton}>
										<Ionicons name="camera" size={18} color="#FFFFFF" />
									</View>
								)}
							</TouchableOpacity>
							{!isEditing && (
								<>
									<Text style={styles.profileName}>
										{profile?.name || "Set up your profile"}
									</Text>
									{profile?.email && (
										<Text style={styles.profileEmail}>{profile.email}</Text>
									)}
								</>
							)}
						</View>

						{/* Edit Form */}
						{isEditing ? (
							<View style={styles.formSection}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Name *</Text>
									<TextInput
										style={styles.input}
										placeholder="Enter your name"
										placeholderTextColor={theme.textMuted}
										value={name}
										onChangeText={setName}
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Email</Text>
									<TextInput
										style={styles.input}
										placeholder="Enter your email"
										placeholderTextColor={theme.textMuted}
										value={email}
										onChangeText={setEmail}
										keyboardType="email-address"
										autoCapitalize="none"
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Bio</Text>
									<TextInput
										style={[styles.input, styles.bioInput]}
										placeholder="Tell us about yourself..."
										placeholderTextColor={theme.textMuted}
										value={bio}
										onChangeText={setBio}
										multiline
									/>
								</View>

								<TouchableOpacity
									style={styles.cancelButton}
									onPress={() => {
										setIsEditing(false);
										setName(profile?.name || "");
										setEmail(profile?.email || "");
										setBio(profile?.bio || "");
									}}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						) : (
							<>
								{/* Stats Section */}
								<View style={styles.statsSection}>
									<Text style={styles.sectionTitle}>YOUR JOURNEY</Text>
									<View style={styles.statsGrid}>
										<View style={styles.statCard}>
											<View
												style={[
													styles.statIcon,
													{ backgroundColor: theme.primary + "20" },
												]}
											>
												<Ionicons name="list" size={20} color={theme.primary} />
											</View>
											<Text style={styles.statValue}>{stats.totalHabits}</Text>
											<Text style={styles.statLabel}>Active Habits</Text>
										</View>

										<View style={styles.statCard}>
											<View
												style={[
													styles.statIcon,
													{ backgroundColor: theme.success + "20" },
												]}
											>
												<Ionicons
													name="checkmark-done"
													size={20}
													color={theme.success}
												/>
											</View>
											<Text style={styles.statValue}>
												{stats.totalCompletions}
											</Text>
											<Text style={styles.statLabel}>Total Completions</Text>
										</View>

										<View style={styles.statCard}>
											<View
												style={[
													styles.statIcon,
													{ backgroundColor: theme.warning + "20" },
												]}
											>
												<Ionicons
													name="flame"
													size={20}
													color={theme.warning}
												/>
											</View>
											<Text style={styles.statValue}>
												{stats.currentOverallStreak}
											</Text>
											<Text style={styles.statLabel}>Avg Streak</Text>
										</View>

										<View style={styles.statCard}>
											<View
												style={[
													styles.statIcon,
													{ backgroundColor: theme.accent + "20" },
												]}
											>
												<Ionicons
													name="calendar"
													size={20}
													color={theme.accent}
												/>
											</View>
											<Text style={styles.statValue}>{getMemberSince()}</Text>
											<Text style={styles.statLabel}>Member Since</Text>
										</View>
									</View>
								</View>

								{/* Bio Section */}
								{profile?.bio && (
									<View style={styles.bioSection}>
										<Text style={styles.sectionTitle}>ABOUT</Text>
										<View style={styles.bioCard}>
											<Text style={styles.bioText}>{profile.bio}</Text>
										</View>
									</View>
								)}

								{/* Quick Actions */}
								<View style={styles.actionsSection}>
									<Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
									<View style={styles.actionsList}>
										<TouchableOpacity
											style={styles.actionItem}
											onPress={() => router.push("/two?from=profile")}
										>
											<View
												style={[
													styles.actionIcon,
													{ backgroundColor: theme.primary + "20" },
												]}
											>
												<Ionicons
													name="settings"
													size={20}
													color={theme.primary}
												/>
											</View>
											<View style={styles.actionContent}>
												<Text style={styles.actionTitle}>Settings</Text>
												<Text style={styles.actionDescription}>
													Manage app preferences
												</Text>
											</View>
											<Ionicons
												name="chevron-forward"
												size={20}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									</View>
								</View>
							</>
						)}
					</>
				) : (
					// FITNESS TAB
					<>
						{/* Body Visualization */}
						{!isEditing && (
							<View style={styles.bodyMapSection}>
								{/* View Toggle */}
								<View style={styles.bodyViewToggle}>
									<TouchableOpacity
										style={[
											styles.bodyViewBtn,
											bodyView === "front" && styles.bodyViewBtnActive,
										]}
										onPress={() => setBodyView("front")}
									>
										<Text
											style={[
												styles.bodyViewBtnText,
												bodyView === "front" && styles.bodyViewBtnTextActive,
											]}
										>
											Front
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.bodyViewBtn,
											bodyView === "back" && styles.bodyViewBtnActive,
										]}
										onPress={() => setBodyView("back")}
									>
										<Text
											style={[
												styles.bodyViewBtnText,
												bodyView === "back" && styles.bodyViewBtnTextActive,
											]}
										>
											Back
										</Text>
									</TouchableOpacity>
								</View>
								<View style={styles.bodyMapContainer}>
									<MuscleBodyMap
										gender={gender === "other" ? "male" : gender}
										highlightedMuscles={muscleActivity}
										onMusclePress={handleMusclePress}
										width={width * 0.55}
										height={400}
										showLabels
										theme={theme}
										view={bodyView}
									/>
								</View>
								{/* Selected Muscle Info */}
								{selectedMuscle && (
									<View style={styles.selectedMuscleCard}>
										<View
											style={[
												styles.muscleColorDot,
												{
													backgroundColor:
														MUSCLE_GROUP_INFO[selectedMuscle]?.color ||
														theme.primary,
												},
											]}
										/>
										<Text style={styles.selectedMuscleName}>
											{MUSCLE_GROUP_INFO[selectedMuscle]?.name ||
												selectedMuscle}
										</Text>
										<Text style={styles.selectedMuscleActivity}>
											{muscleActivity[selectedMuscle]}% activity
										</Text>
									</View>
								)}
								{fitnessProfile && (
									<View style={styles.bodyStats}>
										<View style={styles.bodyStat}>
											<Text style={styles.bodyStatValue}>
												{fitnessProfile.height} cm
											</Text>
											<Text style={styles.bodyStatLabel}>Height</Text>
										</View>
										<View style={styles.bodyStat}>
											<Text style={styles.bodyStatValue}>
												{fitnessProfile.weight} kg
											</Text>
											<Text style={styles.bodyStatLabel}>Weight</Text>
										</View>
										{getBMI() && (
											<View style={styles.bodyStat}>
												<Text
													style={[
														styles.bodyStatValue,
														{
															color: getBMICategory(parseFloat(getBMI()!))
																.color,
														},
													]}
												>
													{getBMI()}
												</Text>
												<Text style={styles.bodyStatLabel}>BMI</Text>
											</View>
										)}
									</View>
								)}
							</View>
						)}

						{isEditing ? (
							// FITNESS EDIT FORM
							<View style={styles.formSection}>
								{/* Gender Selection */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Gender</Text>
									<View style={styles.genderSelector}>
										{(["male", "female", "other"] as Gender[]).map((g) => (
											<TouchableOpacity
												key={g}
												style={[
													styles.genderOption,
													gender === g && styles.genderOptionActive,
												]}
												onPress={() => setGender(g)}
											>
												<Ionicons
													name={
														g === "male"
															? "male"
															: g === "female"
															? "female"
															: "male-female"
													}
													size={20}
													color={gender === g ? "#FFFFFF" : theme.textMuted}
												/>
												<Text
													style={[
														styles.genderText,
														gender === g && styles.genderTextActive,
													]}
												>
													{g.charAt(0).toUpperCase() + g.slice(1)}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								{/* Height, Weight, Age */}
								<View style={styles.rowInputs}>
									<View style={[styles.inputGroup, { flex: 1 }]}>
										<Text style={styles.inputLabel}>Height (cm)</Text>
										<TextInput
											style={styles.input}
											placeholder="170"
											placeholderTextColor={theme.textMuted}
											value={height}
											onChangeText={setHeight}
											keyboardType="numeric"
										/>
									</View>
									<View
										style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}
									>
										<Text style={styles.inputLabel}>Weight (kg)</Text>
										<TextInput
											style={styles.input}
											placeholder="70"
											placeholderTextColor={theme.textMuted}
											value={weight}
											onChangeText={setWeight}
											keyboardType="numeric"
										/>
									</View>
									<View
										style={[styles.inputGroup, { flex: 0.7, marginLeft: 12 }]}
									>
										<Text style={styles.inputLabel}>Age</Text>
										<TextInput
											style={styles.input}
											placeholder="25"
											placeholderTextColor={theme.textMuted}
											value={age}
											onChangeText={setAge}
											keyboardType="numeric"
										/>
									</View>
								</View>

								{/* Fitness Level */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Fitness Level</Text>
									<View style={styles.levelSelector}>
										{(
											[
												"beginner",
												"intermediate",
												"advanced",
												"athlete",
											] as FitnessLevel[]
										).map((level) => (
											<TouchableOpacity
												key={level}
												style={[
													styles.levelOption,
													fitnessLevel === level && styles.levelOptionActive,
												]}
												onPress={() => setFitnessLevel(level)}
											>
												<Text
													style={[
														styles.levelText,
														fitnessLevel === level && styles.levelTextActive,
													]}
												>
													{level.charAt(0).toUpperCase() + level.slice(1)}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								{/* Fitness Goals */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Fitness Goals</Text>
									<View style={styles.goalsGrid}>
										{(
											[
												{
													key: "lose_weight",
													label: "Lose Weight",
													icon: "trending-down",
												},
												{
													key: "build_muscle",
													label: "Build Muscle",
													icon: "barbell",
												},
												{
													key: "increase_strength",
													label: "Get Stronger",
													icon: "flash",
												},
												{
													key: "improve_endurance",
													label: "Endurance",
													icon: "heart",
												},
												{
													key: "maintain",
													label: "Maintain",
													icon: "shield-checkmark",
												},
												{
													key: "general_fitness",
													label: "General Fitness",
													icon: "fitness",
												},
											] as { key: FitnessGoal; label: string; icon: string }[]
										).map((goal) => (
											<TouchableOpacity
												key={goal.key}
												style={[
													styles.goalOption,
													fitnessGoals.includes(goal.key) &&
														styles.goalOptionActive,
												]}
												onPress={() => toggleFitnessGoal(goal.key)}
											>
												<Ionicons
													name={goal.icon as any}
													size={18}
													color={
														fitnessGoals.includes(goal.key)
															? "#FFFFFF"
															: theme.textMuted
													}
												/>
												<Text
													style={[
														styles.goalText,
														fitnessGoals.includes(goal.key) &&
															styles.goalTextActive,
													]}
												>
													{goal.label}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								{/* Weekly Goal */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>
										Weekly Workout Goal (days/week)
									</Text>
									<View style={styles.weeklyGoalSelector}>
										{["2", "3", "4", "5", "6", "7"].map((num) => (
											<TouchableOpacity
												key={num}
												style={[
													styles.weeklyOption,
													weeklyGoal === num && styles.weeklyOptionActive,
												]}
												onPress={() => setWeeklyGoal(num)}
											>
												<Text
													style={[
														styles.weeklyText,
														weeklyGoal === num && styles.weeklyTextActive,
													]}
												>
													{num}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								<TouchableOpacity
									style={styles.cancelButton}
									onPress={() => setIsEditing(false)}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						) : (
							// FITNESS VIEW
							<>
								{fitnessProfile ? (
									<>
										{/* Fitness Details Cards */}
										<View style={styles.fitnessCardsSection}>
											<View style={styles.fitnessCard}>
												<View
													style={[
														styles.fitnessCardIcon,
														{ backgroundColor: theme.primary + "20" },
													]}
												>
													<Ionicons
														name="body"
														size={22}
														color={theme.primary}
													/>
												</View>
												<Text style={styles.fitnessCardTitle}>
													Fitness Level
												</Text>
												<Text style={styles.fitnessCardValue}>
													{fitnessProfile.fitnessLevel.charAt(0).toUpperCase() +
														fitnessProfile.fitnessLevel.slice(1)}
												</Text>
											</View>

											<View style={styles.fitnessCard}>
												<View
													style={[
														styles.fitnessCardIcon,
														{ backgroundColor: theme.success + "20" },
													]}
												>
													<Ionicons
														name="calendar"
														size={22}
														color={theme.success}
													/>
												</View>
												<Text style={styles.fitnessCardTitle}>Weekly Goal</Text>
												<Text style={styles.fitnessCardValue}>
													{fitnessProfile.weeklyWorkoutGoal} days/week
												</Text>
											</View>

											<View style={styles.fitnessCard}>
												<View
													style={[
														styles.fitnessCardIcon,
														{ backgroundColor: theme.warning + "20" },
													]}
												>
													<Ionicons
														name="barbell"
														size={22}
														color={theme.warning}
													/>
												</View>
												<Text style={styles.fitnessCardTitle}>Workouts</Text>
												<Text style={styles.fitnessCardValue}>
													{workoutStats.totalWorkouts} total
												</Text>
											</View>

											<View style={styles.fitnessCard}>
												<View
													style={[
														styles.fitnessCardIcon,
														{ backgroundColor: theme.accent + "20" },
													]}
												>
													<Ionicons
														name="flame"
														size={22}
														color={theme.accent}
													/>
												</View>
												<Text style={styles.fitnessCardTitle}>Streak</Text>
												<Text style={styles.fitnessCardValue}>
													{workoutStats.currentStreak} days
												</Text>
											</View>
										</View>

										{/* Goals Section */}
										<View style={styles.goalsSection}>
											<Text style={styles.sectionTitle}>YOUR GOALS</Text>
											<View style={styles.goalsDisplayGrid}>
												{fitnessProfile.goals.map((goal) => (
													<View key={goal} style={styles.goalDisplayChip}>
														<Ionicons
															name={
																goal === "lose_weight"
																	? "trending-down"
																	: goal === "build_muscle"
																	? "barbell"
																	: goal === "increase_strength"
																	? "flash"
																	: goal === "improve_endurance"
																	? "heart"
																	: goal === "maintain"
																	? "shield-checkmark"
																	: "fitness"
															}
															size={14}
															color={theme.primary}
														/>
														<Text style={styles.goalDisplayText}>
															{goal
																.split("_")
																.map(
																	(w) => w.charAt(0).toUpperCase() + w.slice(1)
																)
																.join(" ")}
														</Text>
													</View>
												))}
											</View>
										</View>
									</>
								) : (
									<View style={styles.emptyFitness}>
										<View style={styles.emptyFitnessIcon}>
											<Ionicons
												name="fitness-outline"
												size={48}
												color={theme.textMuted}
											/>
										</View>
										<Text style={styles.emptyFitnessTitle}>
											No Fitness Profile
										</Text>
										<Text style={styles.emptyFitnessSubtitle}>
											Add your fitness details to get personalized
											recommendations
										</Text>
										<TouchableOpacity
											style={styles.setupButton}
											onPress={() => setIsEditing(true)}
										>
											<Text style={styles.setupButtonText}>Set Up Profile</Text>
										</TouchableOpacity>
									</View>
								)}
							</>
						)}
					</>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>
		</SafeAreaView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		backButton: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		editButton: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: theme.primary,
			borderRadius: 20,
		},
		editButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},

		// Avatar Section
		avatarSection: {
			alignItems: "center",
			paddingVertical: 24,
		},
		avatarContainer: {
			position: "relative",
		},
		avatar: {
			width: 100,
			height: 100,
			borderRadius: 50,
		},
		avatarPlaceholder: {
			width: 100,
			height: 100,
			borderRadius: 50,
			justifyContent: "center",
			alignItems: "center",
		},
		avatarInitials: {
			fontSize: 36,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		cameraButton: {
			position: "absolute",
			bottom: 0,
			right: 0,
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.accent,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 3,
			borderColor: theme.background,
		},
		profileName: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginTop: 16,
		},
		profileEmail: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},

		// Form Section
		formSection: {
			paddingHorizontal: 20,
		},
		inputGroup: {
			marginBottom: 20,
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		bioInput: {
			height: 100,
			textAlignVertical: "top",
		},
		cancelButton: {
			alignItems: "center",
			paddingVertical: 14,
			marginTop: 8,
		},
		cancelButtonText: {
			color: theme.textMuted,
			fontWeight: "500",
		},

		// Stats Section
		statsSection: {
			paddingTop: 8,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 12,
			paddingHorizontal: 20,
			letterSpacing: 1,
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			paddingHorizontal: 16,
			gap: 12,
		},
		statCard: {
			width: "47%",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		statIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		statValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
			textAlign: "center",
		},

		// Bio Section
		bioSection: {
			marginTop: 24,
		},
		bioCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginHorizontal: 20,
		},
		bioText: {
			fontSize: 15,
			color: theme.textSecondary,
			lineHeight: 22,
		},

		// Actions Section
		actionsSection: {
			marginTop: 24,
		},
		actionsList: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			marginHorizontal: 20,
			overflow: "hidden",
		},
		actionItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		actionIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		actionContent: {
			flex: 1,
		},
		actionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		actionDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		actionDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginLeft: 70,
		},

		// Tab Styles
		tabContainer: {
			flexDirection: "row",
			marginHorizontal: 20,
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 4,
			marginBottom: 8,
		},
		tab: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 10,
			borderRadius: 10,
			gap: 6,
		},
		tabActive: {
			backgroundColor: theme.background,
		},
		tabText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		tabTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},

		// Body Map Section
		bodyMapSection: {
			alignItems: "center",
			paddingVertical: 16,
		},
		bodyViewToggle: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 16,
		},
		bodyViewBtn: {
			paddingVertical: 8,
			paddingHorizontal: 24,
			borderRadius: 8,
		},
		bodyViewBtnActive: {
			backgroundColor: theme.primary,
		},
		bodyViewBtnText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		bodyViewBtnTextActive: {
			color: "#FFFFFF",
		},
		bodyMapContainer: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 16,
			marginHorizontal: 20,
		},
		selectedMuscleCard: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.surface,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 12,
			marginTop: 12,
		},
		muscleColorDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
		},
		selectedMuscleName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		selectedMuscleActivity: {
			fontSize: 14,
			color: theme.textMuted,
			marginLeft: "auto",
		},
		bodyStats: {
			flexDirection: "row",
			justifyContent: "center",
			gap: 24,
			marginTop: 16,
		},
		bodyStat: {
			alignItems: "center",
		},
		bodyStatValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		bodyStatLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},

		// Gender Selector
		genderSelector: {
			flexDirection: "row",
			gap: 10,
		},
		genderOption: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
			gap: 6,
		},
		genderOptionActive: {
			backgroundColor: theme.primary,
		},
		genderText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		genderTextActive: {
			color: "#FFFFFF",
		},

		// Row Inputs
		rowInputs: {
			flexDirection: "row",
		},

		// Level Selector
		levelSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		levelOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
		},
		levelOptionActive: {
			backgroundColor: theme.primary,
		},
		levelText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		levelTextActive: {
			color: "#FFFFFF",
		},

		// Goals Grid
		goalsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		goalOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 10,
			gap: 6,
		},
		goalOptionActive: {
			backgroundColor: theme.primary,
		},
		goalText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		goalTextActive: {
			color: "#FFFFFF",
		},

		// Weekly Goal Selector
		weeklyGoalSelector: {
			flexDirection: "row",
			gap: 8,
		},
		weeklyOption: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		weeklyOptionActive: {
			backgroundColor: theme.primary,
		},
		weeklyText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.textMuted,
		},
		weeklyTextActive: {
			color: "#FFFFFF",
		},

		// Fitness Cards Section
		fitnessCardsSection: {
			flexDirection: "row",
			flexWrap: "wrap",
			paddingHorizontal: 16,
			gap: 12,
		},
		fitnessCard: {
			width: "47%",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		fitnessCardIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 10,
		},
		fitnessCardTitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 4,
		},
		fitnessCardValue: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},

		// Goals Display Section
		goalsSection: {
			marginTop: 20,
		},
		goalsDisplayGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			paddingHorizontal: 20,
		},
		goalDisplayChip: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.primary + "15",
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 20,
			gap: 6,
		},
		goalDisplayText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.primary,
		},

		// Empty Fitness State
		emptyFitness: {
			alignItems: "center",
			paddingVertical: 40,
			paddingHorizontal: 20,
		},
		emptyFitnessIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyFitnessTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		emptyFitnessSubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginBottom: 20,
		},
		setupButton: {
			backgroundColor: theme.primary,
			paddingVertical: 14,
			paddingHorizontal: 28,
			borderRadius: 14,
		},
		setupButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#FFFFFF",
		},
	});
