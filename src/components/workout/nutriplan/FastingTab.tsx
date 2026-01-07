// Fasting Tab Component
import { Theme } from "@/src/context/themeContext";
import type { FastingType } from "@/src/types/nutrition";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	Dimensions,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { FASTING_PRESETS } from "./constants";

const { width } = Dimensions.get("window");

interface FastingTabProps {
	theme: Theme;
	store: any;
	styles: any;
	currentFast: any;
	formatTime: (hours: number) => string;
	selectedFastingType: FastingType;
	setSelectedFastingType: (type: FastingType) => void;
	customFastingHours: number;
	setCustomFastingHours: (hours: number) => void;
	handleStartFast: () => void;
	handleEndFast: () => void;
}

export const FastingTab = ({
	theme,
	store,
	styles,
	currentFast,
	formatTime,
	selectedFastingType,
	setSelectedFastingType,
	customFastingHours,
	setCustomFastingHours,
	handleStartFast,
	handleEndFast,
}: FastingTabProps) => {
	return (
		<ScrollView showsVerticalScrollIndicator={false}>
			{store.currentFasting && currentFast ? (
				<>
					{/* Active Fast Card */}
					<View
						style={{
							backgroundColor: theme.surface,
							borderRadius: 20,
							padding: 24,
							margin: 20,
							marginTop: 0,
							alignItems: "center",
							borderWidth: 2,
							borderColor: theme.primary + "30",
						}}
					>
						<View
							style={{
								width: 80,
								height: 80,
								borderRadius: 40,
								backgroundColor: theme.primary + "20",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 16,
							}}
						>
							<Ionicons name="timer" size={48} color={theme.primary} />
						</View>

						<Text
							style={{
								fontSize: 36,
								fontWeight: "700",
								color: theme.primary,
								marginBottom: 8,
							}}
						>
							{formatTime(currentFast.elapsedHours)}
						</Text>

						<Text
							style={{
								fontSize: 18,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 4,
							}}
						>
							{currentFast.progress}% Complete
						</Text>

						<Text
							style={{
								fontSize: 14,
								color: theme.textMuted,
								marginBottom: 20,
							}}
						>
							{formatTime(currentFast.remainingHours)} remaining
						</Text>

						{/* Progress Bar */}
						<View
							style={{
								width: "100%",
								height: 8,
								backgroundColor: theme.border,
								borderRadius: 4,
								overflow: "hidden",
								marginBottom: 24,
							}}
						>
							<View
								style={{
									width: `${Math.min(currentFast.progress, 100)}%`,
									height: "100%",
									backgroundColor: theme.primary,
									borderRadius: 4,
								}}
							/>
						</View>

						{/* End Fast Button */}
						<TouchableOpacity
							style={{
								backgroundColor: theme.error,
								paddingVertical: 14,
								paddingHorizontal: 32,
								borderRadius: 12,
								flexDirection: "row",
								alignItems: "center",
								gap: 8,
							}}
							onPress={handleEndFast}
						>
							<Ionicons name="stop-circle" size={20} color="#FFF" />
							<Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
								End Fast
							</Text>
						</TouchableOpacity>
					</View>

					{/* Fasting Info */}
					<View style={[styles.card, { marginTop: 0 }]}>
						<Text
							style={{
								fontSize: 16,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 12,
							}}
						>
							📝 Current Fast Details
						</Text>
						<View style={{ gap: 8 }}>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
								}}
							>
								<Text style={{ color: theme.textMuted }}>Type:</Text>
								<Text style={{ color: theme.text, fontWeight: "500" }}>
									{store.currentFasting.type?.toUpperCase() || "Custom"} Fast
								</Text>
							</View>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
								}}
							>
								<Text style={{ color: theme.textMuted }}>Started:</Text>
								<Text style={{ color: theme.text, fontWeight: "500" }}>
									{new Date(store.currentFasting.startTime).toLocaleString(
										"en-US",
										{
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "2-digit",
										}
									)}
								</Text>
							</View>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
								}}
							>
								<Text style={{ color: theme.textMuted }}>Goal Duration:</Text>
								<Text style={{ color: theme.text, fontWeight: "500" }}>
									{store.currentFasting.plannedDuration} hours
								</Text>
							</View>
						</View>
					</View>
				</>
			) : (
				<>
					{/* Start Fasting Card */}
					<View style={styles.card}>
						<View style={{ alignItems: "center", marginBottom: 20 }}>
							<View
								style={{
									width: 60,
									height: 60,
									borderRadius: 30,
									backgroundColor: theme.primary + "20",
									alignItems: "center",
									justifyContent: "center",
									marginBottom: 12,
								}}
							>
								<Ionicons name="timer" size={32} color={theme.primary} />
							</View>
							<Text
								style={{
									fontSize: 18,
									fontWeight: "700",
									color: theme.text,
									marginBottom: 6,
								}}
							>
								Start Intermittent Fasting
							</Text>
							<Text
								style={{
									fontSize: 13,
									color: theme.textMuted,
									textAlign: "center",
									lineHeight: 18,
								}}
							>
								Select a fasting protocol to begin tracking
							</Text>
						</View>

						{/* Fasting Presets */}
						<Text
							style={{
								fontSize: 14,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 12,
							}}
						>
							Popular Protocols
						</Text>
						<View
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								gap: 12,
								marginBottom: 16,
							}}
						>
							{FASTING_PRESETS.map((preset) => {
								const isSelected = selectedFastingType === preset.type;
								return (
									<TouchableOpacity
										key={preset.type}
										style={{
											flex: 1,
											minWidth: (width - 80) / 2,
											backgroundColor: isSelected
												? theme.primary + "20"
												: theme.background,
											borderWidth: 2,
											borderColor: isSelected ? theme.primary : theme.border,
											borderRadius: 12,
											padding: 16,
											alignItems: "center",
										}}
										onPress={() => setSelectedFastingType(preset.type)}
									>
										<Text
											style={{
												fontSize: 18,
												fontWeight: "700",
												color: isSelected ? theme.primary : theme.text,
												marginBottom: 4,
											}}
										>
											{preset.label}
										</Text>
										<Text
											style={{
												fontSize: 13,
												fontWeight: "600",
												color: theme.textMuted,
												marginBottom: 6,
											}}
										>
											{preset.hours}h fast
										</Text>
										<Text
											style={{
												fontSize: 11,
												color: theme.textMuted,
												textAlign: "center",
												lineHeight: 14,
											}}
											numberOfLines={2}
										>
											{preset.description}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{selectedFastingType === "custom" && (
							<View style={{ marginTop: 8, marginBottom: 16 }}>
								<Text
									style={{
										fontSize: 13,
										color: theme.textMuted,
										marginBottom: 8,
									}}
								>
									Custom fasting duration (hours)
								</Text>
								<TextInput
									style={[
										styles.searchInput,
										{ textAlign: "center", fontSize: 18, fontWeight: "600" },
									]}
									placeholder="Enter hours (e.g., 18)"
									placeholderTextColor={theme.textSecondary}
									value={customFastingHours.toString()}
									onChangeText={(text) => {
										const hours = parseInt(text);
										if (!isNaN(hours) && hours > 0 && hours <= 72) {
											setCustomFastingHours(hours);
										}
									}}
									keyboardType="numeric"
								/>
								<Text
									style={{
										fontSize: 11,
										color: theme.textMuted,
										textAlign: "center",
										marginTop: 6,
									}}
								>
									💡 Recommended: 12-24 hours for beginners
								</Text>
							</View>
						)}

						<TouchableOpacity
							style={[
								styles.addButton,
								{
									backgroundColor: theme.primary,
									flexDirection: "row",
									gap: 8,
									alignItems: "center",
									justifyContent: "center",
								},
							]}
							onPress={handleStartFast}
						>
							<Ionicons name="play-circle" size={20} color="#FFF" />
							<Text style={styles.addButtonText}>Start Fast</Text>
						</TouchableOpacity>
					</View>

					{/* Fasting History */}
					<Text style={styles.sectionTitle}>Fasting History</Text>
					{store.getFastingHistory().length === 0 ? (
						<View style={styles.emptyState}>
							<Ionicons
								name="time-outline"
								size={48}
								color={theme.textSecondary}
							/>
							<Text style={styles.emptyStateText}>No completed fasts yet</Text>
							<Text
								style={{
									fontSize: 12,
									color: theme.textMuted,
									marginTop: 6,
									textAlign: "center",
								}}
							>
								Complete your first fast to see history
							</Text>
						</View>
					) : (
						<View style={styles.card}>
							{store
								.getFastingHistory()
								.slice(0, 5)
								.map((fast: any, index: number) => {
									const startTime =
										fast.startTime instanceof Date
											? fast.startTime
											: new Date(fast.startTime);
									const duration =
										fast.actualDuration || fast.plannedDuration || 0;
									const fastType = fast.type || fast.fastingType || "Custom";

									return (
										<View
											key={fast.id}
											style={[
												styles.mealLogItem,
												index ===
													Math.min(4, store.getFastingHistory().length - 1) && {
													borderBottomWidth: 0,
												},
											]}
										>
											<View style={{ flex: 1 }}>
												<Text style={styles.mealLogTitle}>
													{fastType.toUpperCase()} Fast
												</Text>
												<Text style={styles.mealLogSubtitle}>
													{startTime.toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</Text>
											</View>
											<View style={{ alignItems: "flex-end" }}>
												<Text
													style={{
														fontSize: 18,
														fontWeight: "700",
														color: theme.primary,
													}}
												>
													{duration.toFixed(1)}h
												</Text>
												<Text
													style={{
														fontSize: 11,
														color: theme.textMuted,
														marginTop: 2,
													}}
												>
													Duration
												</Text>
											</View>
										</View>
									);
								})}
						</View>
					)}
				</>
			)}

			{/* Fasting Benefits */}
			<View style={[styles.card, { marginTop: 16 }]}>
				<Text
					style={{
						fontSize: 16,
						fontWeight: "700",
						color: theme.text,
						marginBottom: 12,
					}}
				>
					✨ Benefits of Fasting
				</Text>
				<Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
					• Improved insulin sensitivity and blood sugar control{"\n"}• Enhanced
					autophagy (cellular cleanup and repair){"\n"}• Increased mental
					clarity and focus{"\n"}• Supports weight management and fat loss{"\n"}
					• Reduced inflammation markers{"\n"}• May promote longevity and
					healthspan
				</Text>
			</View>

			<View style={{ height: 100 }} />
		</ScrollView>
	);
};
