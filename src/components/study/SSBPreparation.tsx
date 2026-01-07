import { Theme, useColors } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	Dimensions,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import CAandSKSection from "./ssb/CAandSKSection";
import GDGPEPIQSection from "./ssb/GDGPEPIQSection";
import PPDTTATSection from "./ssb/PPDTTATSection";
import SDSection from "./ssb/SDSection";
import WATSRTSection from "./ssb/WATSRTSection";

const { width } = Dimensions.get("window");

export default function SSBPreparation() {
	const theme = useColors();
	const styles = createStyles(theme);

	const [activeTab, setActiveTab] = useState<
		"sd" | "ppdt" | "tat" | "wat" | "srt" | "gd" | "gpe" | "piq" | "ca" | "sk"
	>("sd");

	const TAB_CONFIG = [
		{
			id: "sd",
			label: "Self Description",
			icon: "person",
			color: "#6366F1",
		},
		{
			id: "ppdt",
			label: "PPDT (2/day)",
			icon: "layers",
			color: "#8B5CF6",
		},
		{
			id: "tat",
			label: "TAT (2/day)",
			icon: "image",
			color: "#EC4899",
		},
		{
			id: "wat",
			label: "WAT (15/day)",
			icon: "chatbox",
			color: "#EF4444",
		},
		{
			id: "srt",
			label: "SRT (15/day)",
			icon: "reader",
			color: "#F97316",
		},
		{
			id: "gd",
			label: "Group Discussion",
			icon: "people",
			color: "#FBBF24",
		},
		{
			id: "gpe",
			label: "GPE (Image + Q)",
			icon: "images",
			color: "#22C55E",
		},
		{
			id: "piq",
			label: "PIQ",
			icon: "help-circle",
			color: "#14B8A6",
		},
		{
			id: "ca",
			label: "Current Affairs",
			icon: "newspaper",
			color: "#06B6D4",
		},
		{
			id: "sk",
			label: "Subject Knowledge",
			icon: "book",
			color: "#3B82F6",
		},
	] as const;

	return (
		<View style={styles.container}>
			{/* Tab Navigation */}
			<FlatList
				horizontal
				showsHorizontalScrollIndicator={false}
				data={TAB_CONFIG}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.tabsContainer}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[
							styles.tab,
							activeTab === item.id && styles.tabActive,
							{ borderColor: item.color },
						]}
						onPress={() => setActiveTab(item.id as any)}
					>
						<Ionicons
							name={item.icon as any}
							size={20}
							color={activeTab === item.id ? item.color : theme.textSecondary}
						/>
						<Text
							style={[
								styles.tabLabel,
								activeTab === item.id && styles.tabLabelActive,
							]}
							numberOfLines={1}
						>
							{item.label}
						</Text>
					</TouchableOpacity>
				)}
			/>

			{/* Content Area - Route to appropriate section component */}
			{activeTab === "sd" && <SDSection theme={theme} />}
			{(activeTab === "ppdt" || activeTab === "tat") && (
				<PPDTTATSection theme={theme} activeTab={activeTab} />
			)}
			{(activeTab === "wat" || activeTab === "srt") && (
				<WATSRTSection theme={theme} activeTab={activeTab} />
			)}
			{(activeTab === "gd" || activeTab === "gpe" || activeTab === "piq") && (
				<GDGPEPIQSection theme={theme} activeTab={activeTab} />
			)}
			{(activeTab === "ca" || activeTab === "sk") && (
				<CAandSKSection theme={theme} activeTab={activeTab} />
			)}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		tabsContainer: {
			paddingHorizontal: 12,
			paddingVertical: 12,
			gap: 8,
		},
		tab: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 20,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 6,
		},
		tabActive: {
			borderWidth: 2,
			backgroundColor: theme.surface,
		},
		tabLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			maxWidth: 90,
		},
		tabLabelActive: {
			color: theme.text,
			fontWeight: "600",
		},
	});
