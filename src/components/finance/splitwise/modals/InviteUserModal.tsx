import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";

// Invite User Modal
interface InviteUserModalProps {
	visible: boolean;
	onClose: () => void;
	searchQuery: string;
	searchResults:
		| Array<{ id: string; email: string; full_name: string }>
		| undefined;
	isSearching?: boolean;
	inviteMessage?: string;
	setInviteMessage?: (msg: string) => void;
	onSearch: (query: string) => void;
	onInvite: (userId: string, name: string) => void;
	theme: Theme;
	styles: any;
	getInitials: (name: string) => string;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
	visible,
	onClose,
	searchQuery,
	searchResults,
	isSearching,
	onSearch,
	onInvite,
	theme,
	styles,
	getInitials,
}) => {
	const [localQuery, setLocalQuery] = useState(searchQuery);

	return (
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
							<Text style={styles.modalCancel}>Cancel</Text>
						</TouchableOpacity>
						<Text style={styles.modalTitle}>Invite User</Text>
						<View style={{ width: 60 }} />
					</View>

					<View>
						<View style={styles.searchContainer}>
							<Ionicons name="search" size={20} color={theme.textMuted} />
							<TextInput
								style={styles.searchInput}
								placeholder="Search by name or email address"
								placeholderTextColor={theme.textMuted}
								value={localQuery}
								onChangeText={setLocalQuery}
								keyboardType="email-address"
								autoCapitalize="none"
								returnKeyType="search"
								onSubmitEditing={() => onSearch(localQuery)}
							/>
							<TouchableOpacity
								style={styles.searchButton}
								onPress={() => onSearch(localQuery)}
							>
								{isSearching ? (
									<ActivityIndicator size="small" color="#FFF" />
								) : (
									<Text style={styles.searchButtonText}>Search</Text>
								)}
							</TouchableOpacity>
						</View>

						{(searchResults?.length ?? 0) > 0 ? (
							<View style={styles.searchResults}>
								{searchResults?.map((user) => (
									<View key={user.id} style={styles.searchResultItem}>
										<View style={styles.searchResultAvatar}>
											<Text style={styles.searchResultInitial}>
												{getInitials(user.full_name || user.email)}
											</Text>
										</View>
										<View style={styles.searchResultInfo}>
											<Text style={styles.searchResultName}>
												{user.full_name || "LifeSync User"}
											</Text>
											<Text style={styles.searchResultEmail}>{user.email}</Text>
										</View>
										<TouchableOpacity
											style={styles.inviteButton}
											onPress={() =>
												onInvite(user.id, user.full_name || user.email)
											}
										>
											<Text style={styles.inviteButtonText}>Invite</Text>
										</TouchableOpacity>
									</View>
								))}
							</View>
						) : (
							<View style={styles.searchEmpty}>
								<Ionicons
									name="people-outline"
									size={48}
									color={theme.textMuted}
								/>
								<Text style={styles.searchEmptyText}>
									Search for users by name or email
								</Text>
								<Text style={styles.searchEmptySubtext}>
									Find LifeSync users to add to your group
								</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</Modal>
	);
};
