// Gut Health Tab Component
import { Theme } from "@/src/context/themeContext";
import { getPrebioticFoods, getProbioticFoods } from "@/src/data/mealDatabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	FlatList,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface GutHealthTabProps {
	theme: Theme;
	store: any;
	styles: any;
	onLogPress: () => void;
}

export const GutHealthTab = ({
	theme,
	store,
	styles,
	onLogPress,
}: GutHealthTabProps) => {
	return (
		<ScrollView showsVerticalScrollIndicator={false}>
			{/* Header Card */}
			<View style={styles.card}>
				<View style={{ alignItems: "center", marginBottom: 16 }}>
					<Ionicons name="leaf" size={48} color={theme.success} />
					<Text
						style={{
							fontSize: 18,
							fontWeight: "700",
							color: theme.text,
							marginTop: 12,
						}}
					>
						Track Your Gut Health
					</Text>
					<Text
						style={{
							fontSize: 13,
							color: theme.textMuted,
							textAlign: "center",
							marginTop: 6,
							lineHeight: 18,
						}}
					>
						Monitor digestion, symptoms, and Bristol stool scale for better gut
						health insights
					</Text>
				</View>

				<TouchableOpacity
					style={[
						styles.addButton,
						{
							backgroundColor: theme.success,
							flexDirection: "row",
							gap: 8,
							alignItems: "center",
							justifyContent: "center",
						},
					]}
					onPress={onLogPress}
				>
					<Ionicons name="add-circle" size={20} color="#FFF" />
					<Text style={styles.addButtonText}>Log Gut Health</Text>
				</TouchableOpacity>
			</View>

			{/* Recent Logs */}
			<Text style={styles.sectionTitle}>Recent Logs</Text>
			{store.gutHealthLogs.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="leaf-outline" size={48} color={theme.textSecondary} />
					<Text style={styles.emptyStateText}>No gut health logs yet</Text>
					<Text
						style={{
							fontSize: 12,
							color: theme.textMuted,
							marginTop: 6,
							textAlign: "center",
						}}
					>
						Start logging to track patterns and improve your gut health
					</Text>
				</View>
			) : (
				<View style={styles.card}>
					{store.gutHealthLogs.slice(0, 5).map((log: any, index: number) => {
						const logDate =
							log.date instanceof Date ? log.date : new Date(log.date);
						const digestionRating =
							log.digestionRating || log.overallGutFeeling || 3;
						const stoolType = log.stoolType || log.stoolLog?.type || "N/A";

						return (
							<View
								key={log.id}
								style={[
									styles.mealLogItem,
									index === Math.min(4, store.gutHealthLogs.length - 1) && {
										borderBottomWidth: 0,
									},
								]}
							>
								<View style={{ flex: 1 }}>
									<Text style={styles.mealLogTitle}>
										{logDate.toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</Text>
									<Text style={styles.mealLogSubtitle}>
										Bristol Type {stoolType} • Digestion: {digestionRating}/5
									</Text>
									{log.symptoms && log.symptoms.length > 0 && (
										<Text
											style={{
												fontSize: 11,
												color: theme.textMuted,
												marginTop: 4,
											}}
										>
											{log.symptoms.slice(0, 2).join(", ")}
										</Text>
									)}
								</View>
								<View
									style={{
										alignItems: "center",
										justifyContent: "center",
										marginLeft: 12,
									}}
								>
									<Ionicons
										name={
											digestionRating >= 4
												? "happy"
												: digestionRating >= 3
												? "happy-outline"
												: "sad"
										}
										size={28}
										color={
											digestionRating >= 4
												? theme.success
												: digestionRating >= 3
												? theme.warning
												: theme.error
										}
									/>
									<Text
										style={{
											fontSize: 11,
											color:
												digestionRating >= 4
													? theme.success
													: digestionRating >= 3
													? theme.warning
													: theme.error,
											marginTop: 4,
											fontWeight: "600",
										}}
									>
										{digestionRating >= 4
											? "Great"
											: digestionRating >= 3
											? "Good"
											: "Poor"}
									</Text>
								</View>
							</View>
						);
					})}
				</View>
			)}

			{/* Probiotic Foods */}
			<Text style={styles.sectionTitle}>🦠 Probiotic Foods</Text>
			<Text
				style={{
					fontSize: 12,
					color: theme.textMuted,
					marginHorizontal: 20,
					marginBottom: 12,
					lineHeight: 16,
				}}
			>
				Foods containing beneficial bacteria that support digestive health
			</Text>
			<FlatList
				horizontal
				data={getProbioticFoods().slice(0, 10)}
				keyExtractor={(item) => item.id}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 20 }}
				renderItem={({ item }) => (
					<View
						style={{
							width: 140,
							marginRight: 12,
							backgroundColor: theme.primary + "10",
							borderWidth: 1,
							borderColor: theme.primary + "20",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								fontWeight: "500",
								color: theme.text,
							}}
							numberOfLines={1}
						>
							{item.name}
						</Text>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								marginTop: 6,
								lineHeight: 14,
							}}
							numberOfLines={2}
						>
							{item.gutHealthNotes || "Good for gut health"}
						</Text>
					</View>
				)}
			/>

			{/* Prebiotic Foods */}
			<Text style={[styles.sectionTitle, { marginTop: 16 }]}>
				🌱 Prebiotic Foods
			</Text>
			<Text
				style={{
					fontSize: 12,
					color: theme.textMuted,
					marginHorizontal: 20,
					marginBottom: 12,
					lineHeight: 16,
				}}
			>
				Fiber-rich foods that feed beneficial gut bacteria
			</Text>
			<FlatList
				horizontal
				data={getPrebioticFoods().slice(0, 10)}
				keyExtractor={(item) => item.id}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 20 }}
				renderItem={({ item }) => (
					<View
						style={{
							width: 140,
							marginRight: 12,
							backgroundColor: theme.success + "10",
							borderWidth: 1,
							borderColor: theme.success + "20",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								fontWeight: "500",
								color: theme.text,
							}}
							numberOfLines={1}
						>
							{item.name}
						</Text>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								marginTop: 6,
								lineHeight: 14,
							}}
							numberOfLines={2}
						>
							{item.gutHealthNotes || "Feeds good bacteria"}
						</Text>
					</View>
				)}
			/>

			{/* Gut Health Tips */}
			<View style={[styles.card, { marginTop: 16 }]}>
				<Text style={styles.cardTitle}>💡 Gut Health Tips</Text>
				<Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
					• Eat fermented foods daily (yogurt, kimchi, sauerkraut){"\n"}•
					Include fiber-rich vegetables and whole grains{"\n"}• Stay hydrated -
					water aids digestion{"\n"}• Manage stress through meditation or
					exercise
					{"\n"}• Avoid excessive processed foods and sugar
				</Text>
			</View>

			<View style={{ height: 100 }} />
		</ScrollView>
	);
};
