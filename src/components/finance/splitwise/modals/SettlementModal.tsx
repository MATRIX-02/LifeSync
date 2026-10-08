import { Theme } from "@/src/context/themeContext";
import { GroupMember } from "@/src/types/finance";
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

// Settlement Modal
interface SettlementModalProps {
	visible: boolean;
	onClose: () => void;
	onSettle: () => void;
	settlementForm: {
		from: string;
		to: string;
		amount: string;
		note: string;
	};
	setSettlementForm: React.Dispatch<
		React.SetStateAction<{
			from: string;
			to: string;
			amount: string;
			note: string;
		}>
	>;
	members: GroupMember[];
	theme: Theme;
	currency: string;
	styles: any;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
	visible,
	onClose,
	onSettle,
	settlementForm,
	setSettlementForm,
	members,
	theme,
	currency,
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
						<Text style={styles.modalCancel}>Cancel</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Record Settlement</Text>
					<TouchableOpacity onPress={onSettle}>
						<Text style={styles.modalSave}>Save</Text>
					</TouchableOpacity>
				</View>

				<ScrollView showsVerticalScrollIndicator={false}>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Who is paying?</Text>
						<View style={styles.memberSelectList}>
							{members.map((member) => (
								<TouchableOpacity
									key={member.id}
									style={[
										styles.memberSelectOption,
										settlementForm.from === member.id &&
											styles.memberSelectOptionSelected,
									]}
									onPress={() =>
										setSettlementForm((prev) => ({ ...prev, from: member.id }))
									}
								>
									<Text
										style={[
											styles.memberSelectText,
											settlementForm.from === member.id &&
												styles.memberSelectTextSelected,
										]}
									>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Who are they paying?</Text>
						<View style={styles.memberSelectList}>
							{members
								.filter((m) => m.id !== settlementForm.from)
								.map((member) => (
									<TouchableOpacity
										key={member.id}
										style={[
											styles.memberSelectOption,
											settlementForm.to === member.id &&
												styles.memberSelectOptionSelected,
										]}
										onPress={() =>
											setSettlementForm((prev) => ({ ...prev, to: member.id }))
										}
									>
										<Text
											style={[
												styles.memberSelectText,
												settlementForm.to === member.id &&
													styles.memberSelectTextSelected,
											]}
										>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
									</TouchableOpacity>
								))}
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Amount</Text>
						<View style={styles.amountInputContainer}>
							<Text style={styles.currencyPrefix}>{currency}</Text>
							<TextInput
								style={styles.amountInput}
								placeholder="0.00"
								placeholderTextColor={theme.textMuted}
								value={settlementForm.amount}
								onChangeText={(text) =>
									setSettlementForm((prev) => ({ ...prev, amount: text }))
								}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Note (Optional)</Text>
						<TextInput
							style={styles.formInput}
							placeholder="e.g., Venmo payment"
							placeholderTextColor={theme.textMuted}
							value={settlementForm.note}
							onChangeText={(text) =>
								setSettlementForm((prev) => ({ ...prev, note: text }))
							}
						/>
					</View>
				</ScrollView>
			</View>
		</View>
	</Modal>
);
