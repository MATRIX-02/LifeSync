// "Card / account ending in" input for the account forms. The digits are
// stored in finance_accounts.linked_digits and used to match auto-detected
// bank alerts ("A/c XX1234") to this account - see
// src/services/transactionDetection/accountLinks.ts.

import { Theme } from "@/src/context/themeContext";
import { parseDigitsInput } from "@/src/services/transactionDetection/accountLinks";
import React from "react";
import { StyleProp, Text, TextInput, TextStyle, View, ViewStyle } from "react-native";

interface Props {
	value: string;
	onChange: (text: string) => void;
	theme: Theme;
	accountType?: string;
	/** Match the host form's look. */
	groupStyle?: StyleProp<ViewStyle>;
	labelStyle?: StyleProp<TextStyle>;
	inputStyle?: StyleProp<TextStyle>;
}

export default function AccountDigitsField({
	value,
	onChange,
	theme,
	accountType,
	groupStyle,
	labelStyle,
	inputStyle,
}: Props) {
	const parsed = parseDigitsInput(value);
	const hasText = value.trim().length > 0;
	return (
		<View style={groupStyle}>
			<Text style={labelStyle}>
				{accountType === "credit_card" ? "Card ending in" : "Card / account ending in"}{" "}
				<Text style={{ color: theme.textMuted, fontWeight: "400" }}>(optional)</Text>
			</Text>
			<TextInput
				style={inputStyle}
				value={value}
				onChangeText={onChange}
				placeholder={accountType === "credit_card" ? "e.g. 9012" : "e.g. 1234, 5678"}
				placeholderTextColor={theme.textMuted}
				keyboardType="numbers-and-punctuation"
				maxLength={60}
			/>
			<Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 6, lineHeight: 17 }}>
				{hasText && parsed.length === 0
					? "Enter the last 4 digits, e.g. 1234."
					: "Last 4 digits from your bank SMS (\"A/c XX1234\"). Detected payments with these digits go to this account. Separate several with commas."}
			</Text>
		</View>
	);
}
