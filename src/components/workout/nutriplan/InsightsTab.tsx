// Insights Tab Component
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ScrollView, Text, View } from "react-native";

interface InsightsTabProps {
	theme: Theme;
	store: any;
	styles: any;
	macroBreakdown: {
		protein: number;
		carbs: number;
		fat: number;
	};
	insights: any[];
}

export const InsightsTab = ({
	theme,
	store,
	styles,
	macroBreakdown,
	insights,
}: InsightsTabProps) => {
	const weeklyAvg = store.getWeeklyAverages();

	return (
		<ScrollView showsVerticalScrollIndicator={false}>
			{/* Weekly Summary Card */}
			<View style={styles.card}>
				<View style={{ marginBottom: 16 }}>
					<Text
						style={{
							fontSize: 18,
							fontWeight: "700",
							color: theme.text,
							marginBottom: 4,
						}}
					>
						📊 Weekly Average
					</Text>
					<Text
						style={{
							fontSize: 12,
							color: theme.textMuted,
							lineHeight: 16,
						}}
					>
						Your nutrition trends over the past 7 days
					</Text>
				</View>

				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-around",
						gap: 16,
					}}
				>
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 70,
								height: 70,
								borderRadius: 35,
								backgroundColor: theme.primary + "20",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 8,
							}}
						>
							<Text
								style={{
									fontSize: 20,
									fontWeight: "700",
									color: theme.primary,
								}}
							>
								{weeklyAvg.totalCalories}
							</Text>
						</View>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								textAlign: "center",
							}}
						>
							Calories/day
						</Text>
					</View>

					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 70,
								height: 70,
								borderRadius: 35,
								backgroundColor: theme.success + "20",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 8,
							}}
						>
							<Text
								style={{
									fontSize: 20,
									fontWeight: "700",
									color: theme.success,
								}}
							>
								{weeklyAvg.totalProtein}g
							</Text>
						</View>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								textAlign: "center",
							}}
						>
							Protein
						</Text>
					</View>

					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 70,
								height: 70,
								borderRadius: 35,
								backgroundColor: "#2196F3" + "20",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 8,
							}}
						>
							<Text
								style={{
									fontSize: 20,
									fontWeight: "700",
									color: "#2196F3",
								}}
							>
								{(weeklyAvg.totalWater / 1000).toFixed(1)}L
							</Text>
						</View>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								textAlign: "center",
							}}
						>
							Water
						</Text>
					</View>
				</View>
			</View>

			{/* Macro Breakdown */}
			<View style={styles.card}>
				<View style={{ marginBottom: 16 }}>
					<Text
						style={{
							fontSize: 18,
							fontWeight: "700",
							color: theme.text,
							marginBottom: 4,
						}}
					>
						🥧 Today's Macro Split
					</Text>
					<Text
						style={{
							fontSize: 12,
							color: theme.textMuted,
							lineHeight: 16,
						}}
					>
						Percentage breakdown of macronutrients
					</Text>
				</View>

				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-around",
						gap: 16,
					}}
				>
					{/* Protein */}
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 80,
								height: 80,
								borderRadius: 40,
								backgroundColor: theme.success,
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 12,
								borderWidth: 4,
								borderColor: theme.success + "30",
							}}
						>
							<Text
								style={{
									fontSize: 24,
									fontWeight: "700",
									color: "#FFF",
								}}
							>
								{macroBreakdown.protein}%
							</Text>
						</View>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 4,
							}}
						>
							Protein
						</Text>
						<View
							style={{
								backgroundColor: theme.success + "20",
								paddingHorizontal: 8,
								paddingVertical: 4,
								borderRadius: 6,
							}}
						>
							<Text
								style={{
									fontSize: 10,
									color: theme.success,
									fontWeight: "600",
								}}
							>
								Muscle Building
							</Text>
						</View>
					</View>

					{/* Carbs */}
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 80,
								height: 80,
								borderRadius: 40,
								backgroundColor: "#2196F3",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 12,
								borderWidth: 4,
								borderColor: "#2196F3" + "30",
							}}
						>
							<Text
								style={{
									fontSize: 24,
									fontWeight: "700",
									color: "#FFF",
								}}
							>
								{macroBreakdown.carbs}%
							</Text>
						</View>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 4,
							}}
						>
							Carbs
						</Text>
						<View
							style={{
								backgroundColor: "#2196F3" + "20",
								paddingHorizontal: 8,
								paddingVertical: 4,
								borderRadius: 6,
							}}
						>
							<Text
								style={{
									fontSize: 10,
									color: "#2196F3",
									fontWeight: "600",
								}}
							>
								Energy
							</Text>
						</View>
					</View>

					{/* Fat */}
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								width: 80,
								height: 80,
								borderRadius: 40,
								backgroundColor: "#FF9800",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 12,
								borderWidth: 4,
								borderColor: "#FF9800" + "30",
							}}
						>
							<Text
								style={{
									fontSize: 24,
									fontWeight: "700",
									color: "#FFF",
								}}
							>
								{macroBreakdown.fat}%
							</Text>
						</View>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: theme.text,
								marginBottom: 4,
							}}
						>
							Fat
						</Text>
						<View
							style={{
								backgroundColor: "#FF9800" + "20",
								paddingHorizontal: 8,
								paddingVertical: 4,
								borderRadius: 6,
							}}
						>
							<Text
								style={{
									fontSize: 10,
									color: "#FF9800",
									fontWeight: "600",
								}}
							>
								Hormones
							</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Insights Section */}
			<Text
				style={[
					styles.sectionTitle,
					{ fontSize: 16, fontWeight: "700", marginBottom: 12 },
				]}
			>
				💡 Insights & Tips
			</Text>
			{insights.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="bulb-outline" size={48} color={theme.textSecondary} />
					<Text style={styles.emptyStateText}>
						Log more meals for personalized insights
					</Text>
					<Text
						style={{
							fontSize: 12,
							color: theme.textMuted,
							marginTop: 6,
							textAlign: "center",
							paddingHorizontal: 20,
						}}
					>
						Track your nutrition for a few days to get AI-powered
						recommendations
					</Text>
				</View>
			) : (
				<View style={{ gap: 12 }}>
					{insights.map((insight, index) => {
						const backgroundColor =
							insight.type === "success"
								? theme.success + "15"
								: insight.type === "warning"
								? theme.warning + "15"
								: insight.type === "tip"
								? "#9C27B0" + "15"
								: theme.primary + "15";

						const iconColor =
							insight.type === "success"
								? theme.success
								: insight.type === "warning"
								? theme.warning
								: insight.type === "tip"
								? "#9C27B0"
								: theme.primary;

						const iconName =
							insight.icon ||
							(insight.type === "success"
								? "checkmark-circle"
								: insight.type === "warning"
								? "alert-circle"
								: insight.type === "tip"
								? "bulb"
								: "information-circle");

						return (
							<View
								key={index}
								style={{
									backgroundColor: theme.surface,
									borderRadius: 12,
									padding: 16,
									borderLeftWidth: 4,
									borderLeftColor: iconColor,
								}}
							>
								<View
									style={{ flexDirection: "row", alignItems: "flex-start" }}
								>
									<View
										style={{
											width: 40,
											height: 40,
											borderRadius: 20,
											backgroundColor,
											alignItems: "center",
											justifyContent: "center",
											marginRight: 12,
										}}
									>
										<Ionicons
											name={iconName as any}
											size={20}
											color={iconColor}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text
											style={{
												fontSize: 15,
												fontWeight: "600",
												color: theme.text,
												marginBottom: 6,
											}}
										>
											{insight.title}
										</Text>
										<Text
											style={{
												fontSize: 13,
												color: theme.textMuted,
												lineHeight: 18,
											}}
										>
											{insight.message}
										</Text>
									</View>
								</View>
							</View>
						);
					})}
				</View>
			)}

			{/* Nutrition Tips */}
			<View style={[styles.card, { marginTop: 16 }]}>
				<Text
					style={{
						fontSize: 16,
						fontWeight: "700",
						color: theme.text,
						marginBottom: 12,
					}}
				>
					🎯 General Nutrition Tips
				</Text>
				<Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
					• Aim for 0.8-1g protein per lb of body weight{"\n"}• Drink at least
					2-3 liters of water daily{"\n"}• Include colorful vegetables in every
					meal{"\n"}• Time your carbs around workouts for energy{"\n"}• Don't
					fear healthy fats (nuts, avocado, olive oil){"\n"}• Track consistently
					for best results
				</Text>
			</View>

			<View style={{ height: 100 }} />
		</ScrollView>
	);
};
