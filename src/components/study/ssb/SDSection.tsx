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

interface SDSectionProps {
	theme: Theme;
}

export default function SDSection({ theme }: SDSectionProps) {
	const styles = createStyles(theme);
	const sdbData = useStudyStore((state) => state.ssbData);
	const addSDEntry = useStudyStore((state) => state.addSDEntry);
	const deleteSDEntry = useStudyStore((state) => state.deleteSDEntry);

	const [sdText, setSDText] = useState("");

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	};

	const handleAddEntry = () => {
		if (!sdText.trim()) {
			Alert.alert("Error", "Please write your self-description");
			return;
		}
		addSDEntry({
			id: generateId(),
			date: new Date().toLocaleDateString(),
			content: sdText,
			createdAt: new Date().toISOString(),
		});
		setSDText("");
		Alert.alert("Success", "SD Entry added!");
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Self Description (SD)</Text>
				<Text style={styles.hint}>
					📝 Practice your 2-3 minute self-introduction. Share every 3 days.
				</Text>
				<TextInput
					style={[styles.input, styles.inputLarge]}
					value={sdText}
					onChangeText={setSDText}
					placeholder="Write your self-description here..."
					placeholderTextColor={theme.textMuted}
					multiline
				/>
				<TouchableOpacity style={styles.addButton} onPress={handleAddEntry}>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.addButtonText}>Save Entry</Text>
				</TouchableOpacity>

				<View style={styles.entriesList}>
					{sdbData.sd.map((entry) => (
						<View key={entry.id} style={styles.entryCard}>
							<View style={styles.entryHeader}>
								<Text style={styles.entryDate}>{entry.date}</Text>
								<TouchableOpacity onPress={() => deleteSDEntry(entry.id)}>
									<Ionicons name="trash" size={18} color={theme.error} />
								</TouchableOpacity>
							</View>
							<Text style={styles.entryContent}>{entry.content}</Text>
						</View>
					))}
				</View>
			</View>
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
		entryContent: {
			fontSize: 13,
			color: theme.text,
			lineHeight: 18,
		},
	});
