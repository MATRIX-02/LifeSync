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

interface GDGPEPIQSectionProps {
	theme: Theme;
	activeTab: "gd" | "gpe" | "piq";
}

export default function GDGPEPIQSection({
	theme,
	activeTab,
}: GDGPEPIQSectionProps) {
	const styles = createStyles(theme);
	const ssbData = useStudyStore((state) => state.ssbData);
	const addGDEntry = useStudyStore((state) => state.addGDEntry);
	const deleteGDEntry = useStudyStore((state) => state.deleteGDEntry);
	const addGPEEntry = useStudyStore((state) => state.addGPEEntry);
	const deleteGPEEntry = useStudyStore((state) => state.deleteGPEEntry);
	const addPIQEntry = useStudyStore((state) => state.addPIQEntry);
	const deletePIQEntry = useStudyStore((state) => state.deletePIQEntry);

	// GD States
	const [gdTopic, setGDTopic] = useState("");
	const [gdPoints, setGDPoints] = useState("");
	const [gdRating, setGDRating] = useState(5);

	// GPE States
	const [gpeQuestion, setGPEQuestion] = useState("");
	const [gpeResponse, setGPEResponse] = useState("");

	// PIQ States
	const [piqQuestion, setPIQQuestion] = useState("");
	const [piqAnswer, setPIQAnswer] = useState("");

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	};

	const handleAddGDEntry = () => {
		if (!gdTopic.trim()) {
			Alert.alert("Error", "Please enter topic");
			return;
		}
		addGDEntry({
			id: generateId(),
			topic: gdTopic,
			pointsMade: gdPoints.split("\n").filter((p) => p.trim()),
			performanceRating: gdRating,
			notes: "",
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setGDTopic("");
		setGDPoints("");
		setGDRating(5);
		Alert.alert("Success", "GD Entry added!");
	};

	const handleAddGPEEntry = () => {
		if (!gpeQuestion.trim() || !gpeResponse.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addGPEEntry({
			id: generateId(),
			question: gpeQuestion,
			response: gpeResponse,
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setGPEQuestion("");
		setGPEResponse("");
		Alert.alert("Success", "GPE Entry added!");
	};

	const handleAddPIQEntry = () => {
		if (!piqQuestion.trim() || !piqAnswer.trim()) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addPIQEntry({
			id: generateId(),
			question: piqQuestion,
			answer: piqAnswer,
			date: new Date().toLocaleDateString(),
			createdAt: new Date().toISOString(),
		});
		setPIQQuestion("");
		setPIQAnswer("");
		Alert.alert("Success", "PIQ Entry added!");
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{activeTab === "gd" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Group Discussion</Text>
					<Text style={styles.hint}>👥 Topics & Performance Tracking</Text>
					<TextInput
						style={styles.input}
						value={gdTopic}
						onChangeText={setGDTopic}
						placeholder="Discussion topic"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={gdPoints}
						onChangeText={setGDPoints}
						placeholder="Points made (one per line)"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<Text style={styles.ratingLabel}>
						Performance Rating: {gdRating}/10
					</Text>
					<View style={styles.ratingSlider}>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
							<TouchableOpacity
								key={rating}
								style={[
									styles.ratingBtn,
									gdRating === rating && styles.ratingBtnActive,
								]}
								onPress={() => setGDRating(rating)}
							>
								<Text
									style={[
										styles.ratingText,
										gdRating === rating && styles.ratingTextActive,
									]}
								>
									{rating}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<TouchableOpacity style={styles.addButton} onPress={handleAddGDEntry}>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.gd.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteGDEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Topic:</Text>
								<Text style={styles.entryContent}>{entry.topic}</Text>
								<Text style={styles.entryLabel}>
									Rating: {entry.performanceRating}/10
								</Text>
								<Text style={styles.entryLabel}>Points Made:</Text>
								{entry.pointsMade.map((point, idx) => (
									<Text key={idx} style={styles.entryContent}>
										• {point}
									</Text>
								))}
							</View>
						))}
					</View>
				</View>
			)}

			{activeTab === "gpe" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>GPE - Picture Perception</Text>
					<Text style={styles.hint}>
						🎨 Add images and questions for practice
					</Text>
					<TextInput
						style={styles.input}
						value={gpeQuestion}
						onChangeText={setGPEQuestion}
						placeholder="Question about the image"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={gpeResponse}
						onChangeText={setGPEResponse}
						placeholder="Your analysis/response"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddGPEEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.gpe.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deleteGPEEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Question:</Text>
								<Text style={styles.entryContent}>{entry.question}</Text>
								<Text style={styles.entryLabel}>Response:</Text>
								<Text style={styles.entryContent}>{entry.response}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{activeTab === "piq" && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						PIQ - Personal Interview Questions
					</Text>
					<Text style={styles.hint}>🎤 Common questions and your answers</Text>
					<TextInput
						style={styles.input}
						value={piqQuestion}
						onChangeText={setPIQQuestion}
						placeholder="Interview question"
						placeholderTextColor={theme.textMuted}
					/>
					<TextInput
						style={[styles.input, styles.inputLarge]}
						value={piqAnswer}
						onChangeText={setPIQAnswer}
						placeholder="Your answer"
						placeholderTextColor={theme.textMuted}
						multiline
					/>
					<TouchableOpacity
						style={styles.addButton}
						onPress={handleAddPIQEntry}
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.addButtonText}>Save Entry</Text>
					</TouchableOpacity>

					<View style={styles.entriesList}>
						{ssbData.piq.map((entry) => (
							<View key={entry.id} style={styles.entryCard}>
								<View style={styles.entryHeader}>
									<Text style={styles.entryDate}>{entry.date}</Text>
									<TouchableOpacity onPress={() => deletePIQEntry(entry.id)}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
								<Text style={styles.entryLabel}>Q: {entry.question}</Text>
								<Text style={styles.entryContent}>A: {entry.answer}</Text>
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
		ratingSlider: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			marginBottom: 16,
		},
		ratingBtn: {
			width: "18%",
			aspectRatio: 1,
			borderRadius: 8,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		ratingBtnActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		ratingText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		ratingTextActive: {
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
