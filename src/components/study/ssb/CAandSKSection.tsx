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

interface CAandSKSectionProps {
	theme: Theme;
	activeTab: "ca" | "sk";
}

export default function CAandSKSection({
	theme,
	activeTab,
}: CAandSKSectionProps) {
	const styles = createStyles(theme);
	const ssbData = useStudyStore((state) => state.ssbData);
	const addCAEntry = useStudyStore((state) => state.addCAEntry);
	const deleteCAEntry = useStudyStore((state) => state.deleteCAEntry);
	const addSKEntry = useStudyStore((state) => state.addSKEntry);
	const deleteSKEntry = useStudyStore((state) => state.deleteSKEntry);

	// CA States
	const [caTopic, setcaTopic] = useState("");
	const [caDetails, setCADetails] = useState("");
	const [caImportance, setCAImportance] = useState<"low" | "medium" | "high">(
		"medium"
	);

	// SK States
	const [skSubject, setSKSubject] = useState("");
	const [skTopic, setSKTopic] = useState("");
	const [skDetails, setSKDetails] = useState("");

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	};

	const handleAddCAEntry = () => {
		if (!caTopic.trim()) {
			Alert.alert("Error", "Please enter topic");
			return;
		}
		addCAEntry({
			id: generateId(),
			date: new Date().toLocaleDateString(),
			topic: caTopic,
			details: caDetails,
			importance: caImportance,
			createdAt: new Date().toISOString(),
		});
		setcaTopic("");
		setCADetails("");
		Alert.alert("Success", "Current Affairs Entry added!");
	};

	const handleAddSKEntry = () => {
		if (!skSubject.trim() || !skTopic.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addSKEntry({
			id: generateId(),
			subject: skSubject,
			topic: skTopic,
			details: skDetails,
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setSKSubject("");
		setSKTopic("");
		setSKDetails("");
		Alert.alert("Success", "Subject Knowledge Entry added!");
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{activeTab === "ca" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Current Affairs</Text>
					<Text style={styles.hint}>📰 Daily logging of important topics</Text>
					<TextInput
						style={styles.input}
						value={caTopic}
						onChangeText={setcaTopic}
						placeholder="Topic/headline"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={caDetails}
						onChangeText={setCADetails}
						placeholder="Details and significance"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<Text style={styles.ratingLabel}>Importance:</Text>
					<View style={styles.importanceRow}>
						{(["low", "medium", "high"] as const).map((level) => (
							<TouchableOpacity
								key={level}
								style={[
									styles.importanceBtn,
									caImportance === level && styles.importanceBtnActive,
								]}
								onPress={() => setCAImportance(level)}
							>
								<Text
									style={[
										styles.importanceBtnText,
										caImportance === level && styles.importanceBtnTextActive,
									]}
								>
									{level.toUpperCase()}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<TouchableOpacity style={styles.addButton} onPress={handleAddCAEntry}>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.currentAffairs.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<View
										style={[
											styles.importanceBadge,
											{
												backgroundColor:
													entry.importance === "high"
														? "#EF4444"
														: entry.importance === "medium"
														? "#FBBF24"
														: "#22C55E",
											},
										]}
									>
										<Text style={styles.importanceBadgeText}>
											{entry.importance}
										</Text>
									</View>
									<TouchableOpacity onPress={() => deleteCAEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Topic:</Text>
								<Text style={styles.entryContent}>{entry.topic}</Text>
								<Text style={styles.entryLabel}>Details:</Text>
								<Text style={styles.entryContent}>{entry.details}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{activeTab === "sk" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Subject Knowledge</Text>
					<Text style={styles.hint}>📚 Build your knowledge base</Text>
					<TextInput
						style={styles.input}
						value={skSubject}
						onChangeText={setSKSubject}
						placeholder="Subject (e.g., History, Geography)"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={styles.input}
						value={skTopic}
						onChangeText={setSKTopic}
						placeholder="Topic"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={skDetails}
						onChangeText={setSKDetails}
						placeholder="Details and key points"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity style={styles.addButton} onPress={handleAddSKEntry}>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.subjectKnowledge.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteSKEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Subject:</Text>
								<Text style={styles.entryContent}>{entry.subject}</Text>
								<Text style={styles.entryLabel}>Topic:</Text>
								<Text style={styles.entryContent}>{entry.topic}</Text>
								<Text style={styles.entryLabel}>Details:</Text>
								<Text style={styles.entryContent}>{entry.details}</Text>
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
		ratingLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginTop: 8,
			marginBottom: 8,
		},
		importanceRow: {
			flexDirection: "row",
			gap: 10,
			marginBottom: 16,
		},
		importanceBtn: {
			flex: 1,
			paddingVertical: 8,
			borderRadius: 6,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			alignItems: "center",
		},
		importanceBtnActive: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "20",
		},
		importanceBtnText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
		},
		importanceBtnTextActive: {
			color: theme.primary,
		},
		importanceBadge: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 4,
		},
		importanceBadgeText: {
			fontSize: 10,
			fontWeight: "700",
			color: "#fff",
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
