import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { GROUP_COLORS, GROUP_TYPES } from "../constants";

// Create Group Modal
interface CreateGroupModalProps {
	visible: boolean;
	onClose: () => void;
	onCreate: () => void;
	groupForm: { name: string; description: string; color: string; type: string };
	setGroupForm: React.Dispatch<
		React.SetStateAction<{
			name: string;
			description: string;
			color: string;
			type: string;
		}>
	>;
	theme: Theme;
	styles: any;
	isEditing?: boolean;
	onSave?: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
	visible,
	onClose,
	onCreate,
	groupForm,
	setGroupForm,
	theme,
	styles,
	isEditing,
	onSave,
}) => (
	// A bottom sheet, matching Add Transaction. `presentationStyle="pageSheet"`
	// made this a full-screen page, which is far more than a four-field form
	// needs. transparent + an overlay keeps the list visible behind it.
	<Modal
		visible={visible}
		animationType="slide"
		transparent
		onRequestClose={onClose}
	>
		<View style={styles.sheetOverlay}>
			{/* Backdrop is a sibling of the sheet: wrapping the sheet would make it
			    claim the touch responder and swallow scrolls started on its own
			    background. */}
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={StyleSheet.absoluteFill} />
			</TouchableWithoutFeedback>

			<View style={styles.sheetContainer}>
				<View style={styles.sheetHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Cancel</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>
						{isEditing ? "Edit Group" : "Create Group"}
					</Text>
					<TouchableOpacity onPress={isEditing ? onSave : onCreate}>
						<Text style={styles.modalSave}>
							{isEditing ? "Save" : "Create"}
						</Text>
					</TouchableOpacity>
				</View>

				<ScrollView showsVerticalScrollIndicator={false}>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Name</Text>
						<TextInput
							style={styles.formInput}
							placeholder="e.g., Roommates, Trip to Paris"
							placeholderTextColor={theme.textMuted}
							value={groupForm.name}
							onChangeText={(text) =>
								setGroupForm((prev) => ({ ...prev, name: text }))
							}
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Description (Optional)</Text>
						<TextInput
							style={[styles.formInput, { height: 80 }]}
							placeholder="What's this group for?"
							placeholderTextColor={theme.textMuted}
							value={groupForm.description}
							onChangeText={(text) =>
								setGroupForm((prev) => ({ ...prev, description: text }))
							}
							multiline
							textAlignVertical="top"
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Type</Text>
						<View style={styles.typeGrid}>
							{GROUP_TYPES.map((type) => (
								<TouchableOpacity
									key={type.value}
									style={[
										styles.typeOption,
										groupForm.type === type.value && {
											borderColor: theme.primary,
											backgroundColor: theme.primary + "10",
										},
									]}
									onPress={() =>
										setGroupForm((prev) => ({ ...prev, type: type.value }))
									}
								>
									<Ionicons
										name={type.icon as any}
										size={24}
										color={
											groupForm.type === type.value
												? theme.primary
												: theme.textSecondary
										}
									/>
									<Text
										style={[
											styles.typeLabel,
											groupForm.type === type.value && { color: theme.primary },
										]}
									>
										{type.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Color</Text>
						<View style={styles.colorGrid}>
							{GROUP_COLORS.map((color) => (
								<TouchableOpacity
									key={color}
									style={[
										styles.colorOption,
										{ backgroundColor: color },
										groupForm.color === color && styles.colorOptionSelected,
									]}
									onPress={() => setGroupForm((prev) => ({ ...prev, color }))}
								>
									{groupForm.color === color && (
										<Ionicons name="checkmark" size={18} color="#FFF" />
									)}
								</TouchableOpacity>
							))}
						</View>
					</View>
				</ScrollView>
			</View>
		</View>
	</Modal>
);
