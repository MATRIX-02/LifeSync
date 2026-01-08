import { Alert } from "@/src/components/CustomAlert";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	FlatList,
	Modal,
	PanResponder,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { COLORS } from "../../../constants";
import { useHabitManager } from "../../../hooks/useHabitManager";
import { FrequencyType } from "../../../types";
import HabitCard from "../components/HabitCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const HabitTrackerScreen = () => {
	const { habits, completeHabit, deleteHabitPermanently } = useHabitManager();
	const [modalVisible, setModalVisible] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleCompleteHabit = useCallback(
		(habitId: string, habitName: string) => {
			completeHabit(habitId);
			Alert.alert("Success", `Great! You completed "${habitName}"`);
		},
		[completeHabit]
	);

	const handleDeleteHabit = (habitId: string, habitName: string) => {
		Alert.alert(
			"Delete Habit",
			`Are you sure you want to delete "${habitName}"?`,
			[
				{
					text: "Cancel",
					onPress: () => {},
					style: "cancel",
				},
				{
					text: "Delete",
					onPress: () => {
						deleteHabitPermanently(habitId);
						Alert.alert("Deleted", "Habit has been deleted");
					},
					style: "destructive",
				},
			]
		);
	};

	const renderEmptyState = () => (
		<View style={styles.emptyContainer}>
			<Ionicons
				name="checkmark-circle-outline"
				size={64}
				color={COLORS.textSecondary}
			/>
			<Text style={styles.emptyText}>No habits yet</Text>
			<Text style={styles.emptySubtext}>
				Create your first habit to get started!
			</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<FlatList
				data={habits}
				renderItem={({ item }) => (
					<HabitCard
						habit={item}
						onComplete={() => handleCompleteHabit(item.id, item.name)}
						onDelete={() => handleDeleteHabit(item.id, item.name)}
					/>
				)}
				keyExtractor={(item) => item.id}
				contentContainerStyle={
					habits.length === 0 ? styles.emptyContent : styles.listContent
				}
				ListEmptyComponent={renderEmptyState()}
			/>

			{/* FAB - Create Habit */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => setModalVisible(true)}
				activeOpacity={0.8}
			>
				<Ionicons name="add" size={24} color="#fff" />
			</TouchableOpacity>

			{/* Create Habit Modal */}
			<CreateHabitModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
			/>
		</View>
	);
};

interface CreateHabitModalProps {
	visible: boolean;
	onClose: () => void;
}

const HABIT_COLORS = [
	"#A78BFA",
	"#F472B6",
	"#FB923C",
	"#FBBF24",
	"#34D399",
	"#22D3EE",
	"#60A5FA",
	"#818CF8",
	"#E879F9",
	"#F87171",
];

const HABIT_ICONS = [
	"checkmark-circle-outline",
	"water-outline",
	"book-outline",
	"barbell-outline",
	"leaf-outline",
	"moon-outline",
	"walk-outline",
	"code-slash-outline",
	"pencil-outline",
	"musical-notes-outline",
	"nutrition-outline",
	"heart-outline",
	"bicycle-outline",
	"bed-outline",
	"cafe-outline",
	"fitness-outline",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CreateHabitModal: React.FC<CreateHabitModalProps> = ({
	visible,
	onClose,
}) => {
	const { createHabit } = useHabitManager();
	const [habitName, setHabitName] = useState("");
	const [description, setDescription] = useState("");
	const [notificationTime, setNotificationTime] = useState("09:00");
	const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);
	const [selectedIcon, setSelectedIcon] = useState("checkmark-circle-outline");
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);

	// Frequency state
	const [frequencyType, setFrequencyType] = useState<FrequencyType>("daily");
	const [frequencyValue, setFrequencyValue] = useState(1);
	const [selectedDays, setSelectedDays] = useState<number[]>([
		0, 1, 2, 3, 4, 5, 6,
	]);

	// Animation for slide down
	const translateY = useRef(new Animated.Value(0)).current;

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return gestureState.dy > 10;
			},
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy > 0) {
					translateY.setValue(gestureState.dy);
				}
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > 100) {
					Animated.timing(translateY, {
						toValue: SCREEN_HEIGHT,
						duration: 200,
						useNativeDriver: true,
					}).start(() => {
						onClose();
						translateY.setValue(0);
					});
				} else {
					Animated.spring(translateY, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		})
	).current;

	const resetForm = () => {
		setHabitName("");
		setDescription("");
		setSelectedColor(HABIT_COLORS[0]);
		setSelectedIcon("checkmark-circle-outline");
		setFrequencyType("daily");
		setFrequencyValue(1);
		setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
		setNotificationTime("09:00");
		setNotificationsEnabled(true);
		setShowIconPicker(false);
		setShowFrequencyPicker(false);
		setShowTimePicker(false);
		translateY.setValue(0);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const toggleDay = (dayIndex: number) => {
		if (selectedDays.includes(dayIndex)) {
			if (selectedDays.length > 1) {
				setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
			}
		} else {
			setSelectedDays([...selectedDays, dayIndex].sort());
		}
	};

	const getFrequencyLabel = () => {
		switch (frequencyType) {
			case "daily":
				return "Every day";
			case "times_per_day":
				return `${frequencyValue}x per day`;
			case "times_per_week":
				return `${frequencyValue}x per week`;
			case "times_per_month":
				return `${frequencyValue}x per month`;
			case "every_n_days":
				return `Every ${frequencyValue} days`;
			case "specific_days":
				return `${selectedDays.length} days/week`;
			default:
				return "Custom";
		}
	};

	const handleCreateHabit = async () => {
		if (!habitName.trim()) {
			Alert.alert("Error", "Please enter a habit name");
			return;
		}

		try {
			await createHabit({
				name: habitName,
				description,
				color: selectedColor,
				icon: selectedIcon,
				type: "yesno",
				frequency: {
					type: frequencyType,
					value: frequencyValue,
					days: frequencyType === "specific_days" ? selectedDays : undefined,
				},
				notificationTime,
				notificationEnabled: notificationsEnabled,
				ringtoneEnabled: true,
				isArchived: false,
			});

			Alert.alert("Success", "Habit created successfully!");
			resetForm();
			onClose();
		} catch (error) {
			Alert.alert("Error", "Failed to create habit");
			console.error(error);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			<TouchableWithoutFeedback onPress={handleClose}>
				<View style={styles.modalContainer}>
					<TouchableWithoutFeedback>
						<Animated.View
							style={[styles.modalContent, { transform: [{ translateY }] }]}
						>
							{/* Drag Handle */}
							<View
								{...panResponder.panHandlers}
								style={styles.dragHandleContainer}
							>
								<View style={styles.dragHandle} />
							</View>

							<View style={styles.modalHeader}>
								<View style={{ width: 24 }} />
								<Text style={styles.modalTitle}>New Habit</Text>
								<TouchableOpacity onPress={handleClose}>
									<Ionicons name="close" size={24} color={COLORS.text} />
								</TouchableOpacity>
							</View>

							<ScrollView
								showsVerticalScrollIndicator={false}
								style={styles.modalScrollView}
							>
								{/* Basic Info */}
								<Text style={styles.sectionLabel}>BASIC INFO</Text>

								<TextInput
									style={styles.input}
									placeholder="Habit name"
									value={habitName}
									onChangeText={setHabitName}
									placeholderTextColor={COLORS.textSecondary}
								/>

								<TextInput
									style={[styles.input, styles.descriptionInput]}
									placeholder="Description (optional)"
									value={description}
									onChangeText={setDescription}
									multiline
									placeholderTextColor={COLORS.textSecondary}
								/>

								{/* Appearance */}
								<Text style={styles.sectionLabel}>APPEARANCE</Text>

								<Text style={styles.label}>Color</Text>
								<View style={styles.colorPicker}>
									{HABIT_COLORS.map((color) => (
										<TouchableOpacity
											key={color}
											style={[
												styles.colorOption,
												{ backgroundColor: color },
												selectedColor === color && styles.selectedColor,
											]}
											onPress={() => setSelectedColor(color)}
										>
											{selectedColor === color && (
												<Ionicons name="checkmark" size={16} color="#fff" />
											)}
										</TouchableOpacity>
									))}
								</View>

								<Text style={styles.label}>Icon</Text>
								<TouchableOpacity
									style={styles.selector}
									onPress={() => setShowIconPicker(!showIconPicker)}
								>
									<View
										style={[
											styles.selectorIcon,
											{ backgroundColor: selectedColor + "20" },
										]}
									>
										<Ionicons
											name={selectedIcon as any}
											size={24}
											color={selectedColor}
										/>
									</View>
									<Text style={styles.selectorText}>
										{showIconPicker ? "Hide icons" : "Change icon"}
									</Text>
									<Ionicons
										name={showIconPicker ? "chevron-up" : "chevron-down"}
										size={20}
										color={COLORS.textSecondary}
									/>
								</TouchableOpacity>

								{showIconPicker && (
									<View style={styles.iconGrid}>
										{HABIT_ICONS.map((icon) => (
											<TouchableOpacity
												key={icon}
												style={[
													styles.iconOption,
													selectedIcon === icon && {
														backgroundColor: selectedColor + "20",
													},
												]}
												onPress={() => {
													setSelectedIcon(icon);
													setShowIconPicker(false);
												}}
											>
												<Ionicons
													name={icon as any}
													size={24}
													color={
														selectedIcon === icon
															? selectedColor
															: COLORS.textSecondary
													}
												/>
											</TouchableOpacity>
										))}
									</View>
								)}

								{/* Schedule */}
								<Text style={styles.sectionLabel}>SCHEDULE</Text>

								<Text style={styles.label}>Frequency</Text>
								<TouchableOpacity
									style={styles.selector}
									onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
								>
									<View
										style={[
											styles.selectorIcon,
											{ backgroundColor: selectedColor + "20" },
										]}
									>
										<Ionicons name="repeat" size={24} color={selectedColor} />
									</View>
									<Text style={styles.selectorText}>{getFrequencyLabel()}</Text>
									<Ionicons
										name={showFrequencyPicker ? "chevron-up" : "chevron-down"}
										size={20}
										color={COLORS.textSecondary}
									/>
								</TouchableOpacity>

								{showFrequencyPicker && (
									<View style={styles.frequencyPickerContainer}>
										{/* Frequency Type Options */}
										{[
											{
												type: "daily" as FrequencyType,
												label: "Every day",
												icon: "today",
												description: "Complete once daily",
											},
											{
												type: "times_per_day" as FrequencyType,
												label: "Multiple times/day",
												icon: "repeat",
												description: "Complete several times each day",
											},
											{
												type: "specific_days" as FrequencyType,
												label: "Specific days",
												icon: "calendar",
												description: "Choose which days of the week",
											},
											{
												type: "times_per_week" as FrequencyType,
												label: "Times per week",
												icon: "calendar-outline",
												description: "Flexible weekly goal",
											},
											{
												type: "times_per_month" as FrequencyType,
												label: "Times per month",
												icon: "calendar-number-outline",
												description: "Monthly completion goal",
											},
											{
												type: "every_n_days" as FrequencyType,
												label: "Every N days",
												icon: "refresh",
												description: "Custom interval between completions",
											},
										].map((option) => (
											<TouchableOpacity
												key={option.type}
												style={[
													styles.frequencyOption,
													frequencyType === option.type && {
														backgroundColor: selectedColor + "15",
														borderColor: selectedColor,
													},
												]}
												onPress={() => {
													setFrequencyType(option.type);
													if (option.type === "daily") setFrequencyValue(1);
													else if (option.type === "times_per_day")
														setFrequencyValue(2);
													else if (option.type === "times_per_week")
														setFrequencyValue(3);
													else if (option.type === "times_per_month")
														setFrequencyValue(10);
													else if (option.type === "every_n_days")
														setFrequencyValue(2);
												}}
											>
												<View
													style={[
														styles.frequencyOptionIcon,
														{
															backgroundColor:
																frequencyType === option.type
																	? selectedColor + "20"
																	: COLORS.border,
														},
													]}
												>
													<Ionicons
														name={option.icon as any}
														size={20}
														color={
															frequencyType === option.type
																? selectedColor
																: COLORS.textSecondary
														}
													/>
												</View>
												<View style={styles.frequencyOptionContent}>
													<Text
														style={[
															styles.frequencyOptionText,
															frequencyType === option.type && {
																color: selectedColor,
															},
														]}
													>
														{option.label}
													</Text>
													<Text style={styles.frequencyOptionDescription}>
														{option.description}
													</Text>
												</View>
												{frequencyType === option.type && (
													<Ionicons
														name="checkmark-circle"
														size={22}
														color={selectedColor}
													/>
												)}
											</TouchableOpacity>
										))}

										{/* Specific Days Selector */}
										{frequencyType === "specific_days" && (
											<View style={styles.daysSelector}>
												<Text style={styles.daysSelectorLabel}>
													Select days:
												</Text>
												<View style={styles.daysRow}>
													{DAY_NAMES.map((day, index) => (
														<TouchableOpacity
															key={day}
															style={[
																styles.dayButton,
																selectedDays.includes(index) && {
																	backgroundColor: selectedColor,
																	borderColor: selectedColor,
																},
															]}
															onPress={() => toggleDay(index)}
														>
															<Text
																style={[
																	styles.dayButtonText,
																	selectedDays.includes(index) && {
																		color: "#fff",
																	},
																]}
															>
																{day}
															</Text>
														</TouchableOpacity>
													))}
												</View>
											</View>
										)}

										{/* Value Selector for non-daily frequencies */}
										{frequencyType !== "daily" &&
											frequencyType !== "specific_days" && (
												<View style={styles.frequencyValueContainer}>
													<Text style={styles.frequencyValueLabel}>
														{frequencyType === "times_per_day"
															? "Times per day:"
															: frequencyType === "times_per_week"
															? "Times per week:"
															: frequencyType === "times_per_month"
															? "Times per month:"
															: "Every N days:"}
													</Text>
													<View style={styles.frequencyValueSelector}>
														<TouchableOpacity
															style={[
																styles.frequencyValueButton,
																{ backgroundColor: selectedColor + "20" },
															]}
															onPress={() =>
																setFrequencyValue(
																	Math.max(1, frequencyValue - 1)
																)
															}
														>
															<Ionicons
																name="remove"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
														<Text
															style={[
																styles.frequencyValueText,
																{ color: selectedColor },
															]}
														>
															{frequencyValue}
														</Text>
														<TouchableOpacity
															style={[
																styles.frequencyValueButton,
																{ backgroundColor: selectedColor + "20" },
															]}
															onPress={() =>
																setFrequencyValue(frequencyValue + 1)
															}
														>
															<Ionicons
																name="add"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
													</View>
												</View>
											)}
									</View>
								)}

								{/* Reminders */}
								<Text style={styles.sectionLabel}>REMINDERS</Text>

								<View style={styles.switchRow}>
									<View style={styles.switchInfo}>
										<View
											style={[
												styles.selectorIcon,
												{ backgroundColor: selectedColor + "20" },
											]}
										>
											<Ionicons
												name="notifications"
												size={24}
												color={selectedColor}
											/>
										</View>
										<View style={styles.switchTextContainer}>
											<Text style={styles.switchTitle}>Daily Reminder</Text>
											<Text style={styles.switchSubtitle}>
												Get notified to complete your habit
											</Text>
										</View>
									</View>
									<Switch
										value={notificationsEnabled}
										onValueChange={setNotificationsEnabled}
										trackColor={{
											false: COLORS.border,
											true: selectedColor + "60",
										}}
										thumbColor={
											notificationsEnabled
												? selectedColor
												: COLORS.textSecondary
										}
									/>
								</View>

								{notificationsEnabled && (
									<>
										<Text style={styles.label}>Reminder Time</Text>
										<TouchableOpacity
											style={styles.selector}
											onPress={() => setShowTimePicker(!showTimePicker)}
										>
											<View
												style={[
													styles.selectorIcon,
													{ backgroundColor: selectedColor + "20" },
												]}
											>
												<Ionicons name="time" size={24} color={selectedColor} />
											</View>
											<Text style={styles.selectorText}>
												{notificationTime}
											</Text>
											<Ionicons
												name={showTimePicker ? "chevron-up" : "chevron-down"}
												size={20}
												color={COLORS.textSecondary}
											/>
										</TouchableOpacity>

										{showTimePicker && (
											<View style={styles.timePickerContainer}>
												<ScrollView
													horizontal
													showsHorizontalScrollIndicator={false}
												>
													<View style={styles.timeOptions}>
														{[
															"06:00",
															"07:00",
															"08:00",
															"09:00",
															"10:00",
															"11:00",
															"12:00",
															"13:00",
															"14:00",
															"15:00",
															"16:00",
															"17:00",
															"18:00",
															"19:00",
															"20:00",
															"21:00",
															"22:00",
														].map((time) => (
															<TouchableOpacity
																key={time}
																style={[
																	styles.timeOption,
																	notificationTime === time && {
																		backgroundColor: selectedColor,
																		borderColor: selectedColor,
																	},
																]}
																onPress={() => {
																	setNotificationTime(time);
																	setShowTimePicker(false);
																}}
															>
																<Text
																	style={[
																		styles.timeOptionText,
																		notificationTime === time && {
																			color: "#fff",
																		},
																	]}
																>
																	{time}
																</Text>
															</TouchableOpacity>
														))}
													</View>
												</ScrollView>
											</View>
										)}
									</>
								)}

								{/* Preview */}
								<Text style={styles.sectionLabel}>PREVIEW</Text>
								<View style={styles.previewCard}>
									<View
										style={[
											styles.previewIcon,
											{ backgroundColor: selectedColor + "20" },
										]}
									>
										<Ionicons
											name={selectedIcon as any}
											size={28}
											color={selectedColor}
										/>
									</View>
									<View style={styles.previewInfo}>
										<Text
											style={[styles.previewName, { color: selectedColor }]}
										>
											{habitName || "Habit Name"}
										</Text>
										<Text style={styles.previewDescription}>
											{getFrequencyLabel()}
											{notificationsEnabled
												? ` • ${notificationTime}`
												: " • No reminder"}
										</Text>
									</View>
								</View>

								<View style={{ height: 100 }} />
							</ScrollView>

							{/* Sticky Footer Buttons */}
							<View style={styles.stickyFooter}>
								<TouchableOpacity
									style={styles.cancelButton}
									onPress={handleClose}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.createButton,
										{ backgroundColor: selectedColor },
									]}
									onPress={handleCreateHabit}
								>
									<Text style={styles.createButtonText}>Create Habit</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	listContent: {
		padding: 16,
		paddingBottom: 80,
	},
	emptyContent: {
		flex: 1,
		justifyContent: "center",
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.text,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: COLORS.textSecondary,
		marginTop: 8,
	},
	fab: {
		position: "absolute",
		bottom: 20,
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: COLORS.primary,
		justifyContent: "center",
		alignItems: "center",
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: COLORS.surface,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: 20,
		paddingBottom: 40,
		maxHeight: "90%",
	},
	dragHandleContainer: {
		alignItems: "center",
		paddingVertical: 12,
	},
	dragHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: COLORS.border,
	},
	modalScrollView: {
		flexGrow: 0,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.text,
	},
	cancelBtn: {
		color: COLORS.textSecondary,
		fontSize: 16,
	},
	createBtn: {
		fontSize: 16,
		fontWeight: "bold",
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.textSecondary,
		marginTop: 16,
		marginBottom: 12,
		letterSpacing: 0.5,
	},
	input: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 12,
		fontSize: 15,
		color: COLORS.text,
		backgroundColor: COLORS.background,
	},
	descriptionInput: {
		height: 80,
		textAlignVertical: "top",
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
		marginBottom: 10,
	},
	colorPicker: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		marginBottom: 16,
	},
	colorOption: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	selectedColor: {
		borderWidth: 3,
		borderColor: COLORS.text,
	},
	selector: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.background,
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	selectorIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	selectorText: {
		flex: 1,
		fontSize: 15,
		color: COLORS.text,
	},
	iconGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 16,
		padding: 12,
		backgroundColor: COLORS.background,
		borderRadius: 12,
	},
	iconOption: {
		width: 44,
		height: 44,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	frequencyPickerContainer: {
		backgroundColor: COLORS.background,
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
	},
	frequencyOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 10,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	frequencyOptionIcon: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	frequencyOptionContent: {
		flex: 1,
	},
	frequencyOptionText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
	},
	frequencyOptionDescription: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	daysSelector: {
		marginTop: 12,
		padding: 12,
		backgroundColor: COLORS.surface,
		borderRadius: 10,
	},
	daysSelectorLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.text,
		marginBottom: 10,
	},
	daysRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	dayButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	dayButtonText: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.textSecondary,
	},
	frequencyValueContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 12,
		padding: 12,
		backgroundColor: COLORS.surface,
		borderRadius: 10,
	},
	frequencyValueLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
	},
	frequencyValueSelector: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	frequencyValueButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	frequencyValueText: {
		fontSize: 20,
		fontWeight: "bold",
		minWidth: 30,
		textAlign: "center",
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: COLORS.background,
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	switchInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	switchTextContainer: {
		flex: 1,
	},
	switchTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: COLORS.text,
	},
	switchSubtitle: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	timePickerContainer: {
		marginBottom: 16,
	},
	timeOptions: {
		flexDirection: "row",
		gap: 8,
		paddingVertical: 4,
	},
	timeOption: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: COLORS.border,
		backgroundColor: COLORS.background,
	},
	timeOptionText: {
		fontSize: 14,
		fontWeight: "500",
		color: COLORS.text,
	},
	previewCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		backgroundColor: COLORS.background,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	previewIcon: {
		width: 52,
		height: 52,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 14,
	},
	previewInfo: {
		flex: 1,
	},
	previewName: {
		fontSize: 17,
		fontWeight: "bold",
	},
	previewDescription: {
		fontSize: 13,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	notificationToggle: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 16,
	},
	toggleSwitch: {
		width: 50,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.border,
		padding: 2,
		justifyContent: "center",
	},
	toggleSwitchOn: {
		backgroundColor: COLORS.primary,
	},
	toggleThumb: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: COLORS.surface,
		alignSelf: "flex-start",
	},
	toggleThumbOn: {
		alignSelf: "flex-end",
	},
	stickyFooter: {
		flexDirection: "row",
		gap: 12,
		paddingTop: 16,
		paddingBottom: 20,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		backgroundColor: COLORS.surface,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: COLORS.background,
		borderWidth: 1,
		borderColor: COLORS.border,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: COLORS.textSecondary,
	},
	createButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#fff",
	},
});

export default HabitTrackerScreen;
