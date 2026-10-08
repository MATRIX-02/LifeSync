import { Theme } from "@/src/context/themeContext";
import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

// Add Non-User Member Modal
interface AddMemberModalProps {
	visible: boolean;
	onClose: () => void;
	onAdd: () => void;
	memberName: string;
	setMemberName: (name: string) => void;
	theme: Theme;
	styles: any;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
	visible,
	onClose,
	onAdd,
	memberName,
	setMemberName,
	theme,
	styles,
}) => (
	<Modal visible={visible} transparent animationType="fade">
		<View style={styles.alertOverlay}>
			<View style={styles.alertContainer}>
				<Text style={styles.alertTitle}>Add Member</Text>
				<Text style={styles.alertMessage}>
					Add a non-LifeSync user to this group. They won't receive
					notifications.
				</Text>
				<TextInput
					style={styles.alertInput}
					placeholder="Member name"
					placeholderTextColor={theme.textMuted}
					value={memberName}
					onChangeText={setMemberName}
					autoFocus
				/>
				<View style={styles.alertButtons}>
					<TouchableOpacity style={styles.alertButtonCancel} onPress={onClose}>
						<Text style={styles.alertButtonCancelText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.alertButtonConfirm} onPress={onAdd}>
						<Text style={styles.alertButtonConfirmText}>Add</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	</Modal>
);
