import { useColors } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useState } from "react";
import {
	Animated,
	Dimensions,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

export interface AlertButton {
	text: string;
	style?: "default" | "cancel" | "destructive";
	onPress?: () => void;
}

export interface AlertConfig {
	title: string;
	message?: string;
	type?: AlertType;
	buttons?: AlertButton[];
}

interface AlertContextType {
	showAlert: (config: AlertConfig) => void;
	hideAlert: () => void;
}

// Context
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Hook
export const useAlert = () => {
	const context = useContext(AlertContext);
	if (!context) {
		throw new Error("useAlert must be used within an AlertProvider");
	}
	return context;
};

// Helper function to show alert without hook (for use in services)
let globalShowAlert: ((config: AlertConfig) => void) | null = null;

export const Alert = {
	alert: (
		title: string,
		message?: string,
		buttons?: AlertButton[],
		type?: AlertType
	) => {
		if (globalShowAlert) {
			globalShowAlert({ title, message, buttons, type });
		} else {
			// Fallback to native Alert if provider not mounted
			const { Alert: RNAlert } = require("react-native");
			RNAlert.alert(title, message, buttons);
		}
	},
	success: (title: string, message?: string) => {
		Alert.alert(title, message, [{ text: "OK" }], "success");
	},
	error: (title: string, message?: string) => {
		Alert.alert(title, message, [{ text: "OK" }], "error");
	},
	warning: (title: string, message?: string) => {
		Alert.alert(title, message, [{ text: "OK" }], "warning");
	},
	info: (title: string, message?: string) => {
		Alert.alert(title, message, [{ text: "OK" }], "info");
	},
	confirm: (
		title: string,
		message: string,
		onConfirm: () => void,
		onCancel?: () => void,
		confirmText: string = "Confirm",
		cancelText: string = "Cancel",
		destructive: boolean = false
	) => {
		Alert.alert(
			title,
			message,
			[
				{ text: cancelText, style: "cancel", onPress: onCancel },
				{
					text: confirmText,
					style: destructive ? "destructive" : "default",
					onPress: onConfirm,
				},
			],
			"confirm"
		);
	},
};

// Provider Component
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [visible, setVisible] = useState(false);
	const [config, setConfig] = useState<AlertConfig | null>(null);
	const [fadeAnim] = useState(new Animated.Value(0));
	const [scaleAnim] = useState(new Animated.Value(0.8));
	const theme = useColors();

	const showAlert = useCallback(
		(alertConfig: AlertConfig) => {
			setConfig(alertConfig);
			setVisible(true);
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 8,
					tension: 40,
					useNativeDriver: true,
				}),
			]).start();
		},
		[fadeAnim, scaleAnim]
	);

	const hideAlert = useCallback(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 150,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnim, {
				toValue: 0.8,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start(() => {
			setVisible(false);
			setConfig(null);
		});
	}, [fadeAnim, scaleAnim]);

	// Set global function
	React.useEffect(() => {
		globalShowAlert = showAlert;
		return () => {
			globalShowAlert = null;
		};
	}, [showAlert]);

	const handleButtonPress = (button: AlertButton) => {
		hideAlert();
		// Small delay to let animation complete before executing callback
		setTimeout(() => {
			button.onPress?.();
		}, 150);
	};

	const getIconConfig = (
		type: AlertType = "info"
	): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } => {
		switch (type) {
			case "success":
				return {
					name: "checkmark-circle",
					color: "#10B981",
					bg: "#10B98120",
				};
			case "error":
				return {
					name: "close-circle",
					color: "#EF4444",
					bg: "#EF444420",
				};
			case "warning":
				return {
					name: "warning",
					color: "#F59E0B",
					bg: "#F59E0B20",
				};
			case "confirm":
				return {
					name: "help-circle",
					color: "#8B5CF6",
					bg: "#8B5CF620",
				};
			case "info":
			default:
				return {
					name: "information-circle",
					color: "#3B82F6",
					bg: "#3B82F620",
				};
		}
	};

	const styles = createStyles(theme);
	const iconConfig = config ? getIconConfig(config.type) : getIconConfig();

	// Default buttons if none provided
	const buttons = config?.buttons || [{ text: "OK", style: "default" }];

	return (
		<AlertContext.Provider value={{ showAlert, hideAlert }}>
			{children}
			<Modal
				visible={visible}
				transparent
				animationType="none"
				onRequestClose={hideAlert}
				statusBarTranslucent
			>
				<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
					<Animated.View
						style={[
							styles.alertContainer,
							{
								transform: [{ scale: scaleAnim }],
							},
						]}
					>
						{/* Icon */}
						<View
							style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}
						>
							<Ionicons
								name={iconConfig.name}
								size={32}
								color={iconConfig.color}
							/>
						</View>

						{/* Title */}
						<Text style={styles.title}>{config?.title}</Text>

						{/* Message */}
						{config?.message && (
							<Text style={styles.message}>{config.message}</Text>
						)}

						{/* Buttons */}
						<View
							style={[
								styles.buttonContainer,
								buttons.length === 1 && styles.singleButton,
							]}
						>
							{buttons.map((button, index) => {
								const isDestructive = button.style === "destructive";
								const isCancel = button.style === "cancel";
								const isLast = index === buttons.length - 1;

								return (
									<TouchableOpacity
										key={index}
										style={[
											styles.button,
											isCancel && styles.cancelButton,
											isDestructive && styles.destructiveButton,
											!isCancel && !isDestructive && styles.defaultButton,
											buttons.length > 1 && !isLast && { marginRight: 8 },
											buttons.length === 1 && styles.fullWidthButton,
										]}
										onPress={() => handleButtonPress(button)}
										activeOpacity={0.8}
									>
										<Text
											style={[
												styles.buttonText,
												isCancel && styles.cancelButtonText,
												isDestructive && styles.destructiveButtonText,
												!isCancel && !isDestructive && styles.defaultButtonText,
											]}
										>
											{button.text}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</Animated.View>
				</Animated.View>
			</Modal>
		</AlertContext.Provider>
	);
};

const createStyles = (theme: any) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.6)",
			justifyContent: "center",
			alignItems: "center",
			padding: 24,
		},
		alertContainer: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 24,
			width: Math.min(SCREEN_WIDTH - 48, 340),
			alignItems: "center",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.25,
			shadowRadius: 20,
			elevation: 10,
		},
		iconContainer: {
			width: 64,
			height: 64,
			borderRadius: 32,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		title: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			textAlign: "center",
			marginBottom: 8,
		},
		message: {
			fontSize: 14,
			color: theme.textSecondary,
			textAlign: "center",
			lineHeight: 20,
			marginBottom: 24,
		},
		buttonContainer: {
			flexDirection: "row",
			width: "100%",
		},
		singleButton: {
			justifyContent: "center",
		},
		button: {
			flex: 1,
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
		},
		fullWidthButton: {
			flex: 1,
		},
		cancelButton: {
			backgroundColor: theme.background,
			borderWidth: 1,
			borderColor: theme.border,
		},
		destructiveButton: {
			backgroundColor: "#EF4444",
		},
		defaultButton: {
			backgroundColor: theme.primary,
		},
		buttonText: {
			fontSize: 15,
			fontWeight: "600",
		},
		cancelButtonText: {
			color: theme.textSecondary,
		},
		destructiveButtonText: {
			color: "#FFFFFF",
		},
		defaultButtonText: {
			color: "#FFFFFF",
		},
	});

export default AlertProvider;
