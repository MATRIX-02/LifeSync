// One editable value in a set row: weight, reps, distance or time.
//
// Time is shown as m:ss but typing "1:30", "90", "1m30s" or "2m" all work. It
// keeps its own text while focused and only parses on blur/submit, because
// re-formatting on every keystroke would fight the user's typing.

import {
	formatDuration,
	parseDuration,
	SetField,
} from "@/src/data/exerciseTracking";
import React, { useEffect, useState } from "react";
import { StyleProp, TextInput, TextStyle } from "react-native";

interface SetFieldInputProps {
	field: SetField;
	value?: number;
	onChange: (value: number) => void;
	style?: StyleProp<TextStyle>;
	placeholderTextColor?: string;
	editable?: boolean;
}

const toText = (field: SetField, value?: number) =>
	field === "duration"
		? value
			? formatDuration(value)
			: ""
		: value
			? String(value)
			: "";

export default function SetFieldInput({
	field,
	value,
	onChange,
	style,
	placeholderTextColor,
	editable = true,
}: SetFieldInputProps) {
	const [text, setText] = useState(toText(field, value));
	const [focused, setFocused] = useState(false);

	// Follow outside changes (stopwatch, "add set" copying values) unless the
	// user is mid-edit.
	useEffect(() => {
		if (!focused) setText(toText(field, value));
	}, [value, field, focused]);

	const commitDuration = () => {
		const parsed = parseDuration(text);
		if (parsed === null) setText(toText(field, value)); // revert garbage
		else {
			onChange(parsed);
			setText(toText(field, parsed));
		}
	};

	return (
		<TextInput
			style={style}
			value={text}
			editable={editable}
			onFocus={() => setFocused(true)}
			onBlur={() => {
				setFocused(false);
				if (field === "duration") commitDuration();
			}}
			onSubmitEditing={field === "duration" ? commitDuration : undefined}
			onChangeText={(t) => {
				setText(t);
				if (field === "duration") return;
				const n = field === "reps" ? parseInt(t, 10) : parseFloat(t);
				onChange(Number.isFinite(n) ? n : 0);
			}}
			keyboardType={
				field === "duration"
					? "numbers-and-punctuation"
					: field === "reps"
						? "number-pad"
						: "decimal-pad"
			}
			placeholder={field === "duration" ? "0:00" : "0"}
			placeholderTextColor={placeholderTextColor}
			selectTextOnFocus
		/>
	);
}
