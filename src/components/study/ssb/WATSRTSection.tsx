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

interface WATSRTSectionProps {
	theme: Theme;
	activeTab: "wat" | "srt";
}

export default function WATSRTSection({
	theme,
	activeTab,
}: WATSRTSectionProps) {
	const styles = createStyles(theme);
	const ssbData = useStudyStore((state) => state.ssbData);
	const addWATEntry = useStudyStore((state) => state.addWATEntry);
	const deleteWATEntry = useStudyStore((state) => state.deleteWATEntry);
	const addSRTEntry = useStudyStore((state) => state.addSRTEntry);
	const deleteSRTEntry = useStudyStore((state) => state.deleteSRTEntry);

	// WAT States
	const [watWord, setWATWord] = useState("");
	const [watResponse, setWATResponse] = useState("");

	// SRT States
	const [srtSituation, setSRTSituation] = useState("");
	const [srtReaction, setSRTReaction] = useState("");

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	};

	const handleAddWATEntry = () => {
		if (!watWord.trim() || !watResponse.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addWATEntry({
			id: generateId(),
			word: watWord,
			response: watResponse,
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setWATWord("");
		setWATResponse("");
		Alert.alert("Success", "WAT Entry added!");
	};

	const handleAddSRTEntry = () => {
		if (!srtSituation.trim() || !srtReaction.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addSRTEntry({
			id: generateId(),
			situation: srtSituation,
			reaction: srtReaction,
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setSRTSituation("");
		setSRTReaction("");
		Alert.alert("Success", "SRT Entry added!");
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{activeTab === "wat" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>WAT (15 per day)</Text>
					<Text style={styles.hint}>💭 Word Association Test</Text>
					<TextInput
						style={styles.input}
						value={watWord}
						onChangeText={setWATWord}
						placeholder="Word"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={watResponse}
						onChangeText={setWATResponse}
						placeholder="Your association/response"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddWATEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<Text style={styles.statsText}>
						Total WAT entries: {ssbData.wat.length}
					</Text>
					<View style={styles.entriesList}>
						{ssbData.wat.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteWATEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Word:</Text>
								<Text style={styles.entryContent}>{entry.word}</Text>
								<Text style={styles.entryLabel}>Response:</Text>
								<Text style={styles.entryContent}>{entry.response}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{activeTab === "srt" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>SRT (15 per day)</Text>
					<Text style={styles.hint}>⚡ Situation Reaction Test</Text>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={srtSituation}
						onChangeText={setSRTSituation}
						placeholder="Situation or scenario"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={srtReaction}
						onChangeText={setSRTReaction}
						placeholder="Your reaction"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddSRTEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<Text style={styles.statsText}>
						Total SRT entries: {ssbData.srt.length}
					</Text>
					<View style={styles.entriesList}>
						{ssbData.srt.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteSRTEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Situation:</Text>
								<Text style={styles.entryContent}>{entry.situation}</Text>
								<Text style={styles.entryLabel}>Reaction:</Text>
								<Text style={styles.entryContent}>{entry.reaction}</Text>
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
		statsText: {
			fontSize: 13,
			color: theme.textSecondary,
			fontWeight: "600",
			marginBottom: 12,
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
