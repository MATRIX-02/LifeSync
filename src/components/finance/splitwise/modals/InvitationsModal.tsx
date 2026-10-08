import { Theme } from "@/src/context/themeContext";
import { GroupInvitation } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";

// Invitations Modal
interface InvitationsModalProps {
	visible: boolean;
	onClose: () => void;
	invitations: GroupInvitation[];
	onRespond: (invitation: GroupInvitation, accept: boolean) => void;
	theme: Theme;
	styles: any;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
	visible,
	onClose,
	invitations,
	onRespond,
	theme,
	styles,
}) => (
	<Modal
		visible={visible}
		animationType="slide"
		transparent
		onRequestClose={onClose}
	>
		<View style={styles.sheetOverlay}>
			{/* Backdrop is a sibling of the sheet, so it cannot claim the
			    touch responder and swallow the sheet's own scrolls. */}
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={StyleSheet.absoluteFill} />
			</TouchableWithoutFeedback>

			<View style={styles.sheetContainer}>
				<View style={styles.sheetHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Close</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Group Invitations</Text>
					<View style={{ width: 60 }} />
				</View>

				<ScrollView showsVerticalScrollIndicator={false}>
					{invitations.length === 0 ? (
						<View style={styles.emptyInvitations}>
							<Ionicons name="mail-outline" size={48} color={theme.textMuted} />
							<Text style={styles.emptyInvitationsText}>
								No pending invitations
							</Text>
						</View>
					) : (
						invitations.map((invitation) => (
							<View key={invitation.id} style={styles.invitationCard}>
								<View style={styles.invitationInfo}>
									<Text style={styles.invitationGroupName}>
										{invitation.groupName}
									</Text>
									<Text style={styles.invitationInvitedBy}>
										Invited by {invitation.invitedByName}
									</Text>
									<Text style={styles.invitationExpiry}>
										Expires{" "}
										{new Date(invitation.expiresAt).toLocaleDateString()}
									</Text>
								</View>
								<View style={styles.invitationActions}>
									<TouchableOpacity
										style={styles.declineButton}
										onPress={() => onRespond(invitation, false)}
									>
										<Text style={styles.declineButtonText}>Decline</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.acceptButton}
										onPress={() => onRespond(invitation, true)}
									>
										<Text style={styles.acceptButtonText}>Accept</Text>
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</ScrollView>
			</View>
		</View>
	</Modal>
);
