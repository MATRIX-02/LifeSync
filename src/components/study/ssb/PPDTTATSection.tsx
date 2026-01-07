import { useStudyStore } from "@/src/context/studyStoreDB";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface PPDTTATSectionProps {
	theme: Theme;
	activeTab: "ppdt" | "tat";
}

export default function PPDTTATSection({
	theme,
	activeTab,
}: PPDTTATSectionProps) {
	const styles = createStyles(theme);
	const ssbData = useStudyStore((state) => state.ssbData);
	const addPPDTEntry = useStudyStore((state) => state.addPPDTEntry);
	const deletePPDTEntry = useStudyStore((state) => state.deletePPDTEntry);
	const addTATEntry = useStudyStore((state) => state.addTATEntry);
	const deleteTATEntry = useStudyStore((state) => state.deleteTATEntry);

	// PPDT States
	const [ppdtTopics, setPPDTTopics] = useState("");
	const [ppdtPoints, setPPDTPoints] = useState("");

	// TAT States
	const [tatScenario, setTATScenario] = useState("");
	const [tatResponse, setTATResponse] = useState("");
	const [tatReflection, setTATReflection] = useState("");

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	};

	const handleAddPPDTEntry = () => {
		if (!ppdtTopics.trim()) {
			Alert.alert("Error", "Please enter topics");
			return;
		}
		addPPDTEntry({
			id: generateId(),
			date: new Date().toLocaleDateString(),
			topicsDiscussed: ppdtTopics,
			pointsMade: parseInt(ppdtPoints) || 0,
			notes: "",
			createdAt: new Date().toISOString(),
		});
		setPPDTTopics("");
		setPPDTPoints("");
		Alert.alert("Success", "PPDT Entry added!");
	};

	const handleAddTATEntry = () => {
		if (!tatScenario.trim() || !tatResponse.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addTATEntry({
			id: generateId(),
			date: new Date().toLocaleDateString(),
			scenario: tatScenario,
			response: tatResponse,
			reflection: tatReflection,
			createdAt: new Date().toISOString(),
		});
		setTATScenario("");
		setTATResponse("");
		setTATReflection("");
		Alert.alert("Success", "TAT Entry added!");
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{activeTab === "ppdt" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>PPDT (2 per day)</Text>
					<Text style={styles.hint}>
						🖼️ Picture Perception & Discussion Test
					</Text>
					<TextInput
						style={styles.input}
						value={ppdtTopics}
						onChangeText={setPPDTTopics}
						placeholder="Topics discussed"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TextInput
						style={styles.input}
						value={ppdtPoints}
						onChangeText={setPPDTPoints}
						placeholder="Number of points made"
						placeholderTextColor={theme.textMuted}
						keyboardType="numeric"
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddPPDTEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.ppdt.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deletePPDTEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Topics:</Text>
								<Text style={styles.entryContent}>{entry.topicsDiscussed}</Text>
								<Text style={styles.entryLabel}>Points Made:</Text>
								<Text style={styles.entryContent}>{entry.pointsMade}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{activeTab === "tat" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>TAT (2 per day)</Text>
					<Text style={styles.hint}>
						📖 Thematic Apperception Test - Story Writing
					</Text>
					<TextInput
						style={styles.input}
						value={tatScenario}
						onChangeText={setTATScenario}
						placeholder="Scenario or situation"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={tatResponse}
						onChangeText={setTATResponse}
						placeholder="Your response/story"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={tatReflection}
						onChangeText={setTATReflection}
						placeholder="Self reflection (optional)"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddTATEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.tat.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteTATEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Scenario:</Text>
								<Text style={styles.entryContent}>{entry.scenario}</Text>
								<Text style={styles.entryLabel}>Response:</Text>
								<Text style={styles.entryContent}>{entry.response}</Text>
								{entry.reflection && (
									<>
										<Text style={styles.entryLabel}>Reflection:</Text>
										<Text style={styles.entryContent}>{entry.reflection}</Text>
									</>
								)}
							</View>
						))}
					</View>
				</View>
			)}

			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		section: {
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		hint: {
			fontSize: 13,
			color: theme.textSecondary,
			marginBottom: 16,
		},
		input: {
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 8,
			padding: 12,
			color: theme.text,
			marginBottom: 12,
			fontSize: 14,
		},
		inputLarge: {
			minHeight: 100,
			textAlignVertical: "top",
		},
		addButton: {
			backgroundColor: theme.primary,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: 14,
			borderRadius: 8,
			marginBottom: 20,
		},
		addButtonText: {
			color: "#fff",
			fontWeight: "700",
			fontSize: 15,
		},
		entriesList: {
			gap: 12,
		},
		entryCard: {
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 8,
			padding: 12,
			marginBottom: 8,
		},
		entryHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		entryDate: {
			fontSize: 12,
			color: theme.textSecondary,
			fontWeight: "600",
		},
		entryLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
			marginTop: 6,
			marginBottom: 2,
		},
		entryContent: {
			fontSize: 13,
			color: theme.text,
			lineHeight: 18,
		},
	});
