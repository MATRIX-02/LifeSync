// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// react-native's index loads Text from "./Libraries/Text/Text". Point that one
// import at src/utils/AppText.tsx, which wraps the real Text, so every
// `import { Text } from "react-native"` gets the user's text size and the
// Samsung clipping fix. The wrapper itself imports the real file by its full
// path, which isn't redirected.
const RN_INDEX = path.join("node_modules", "react-native", "index.js");
const APP_TEXT = path.resolve(__dirname, "src/utils/AppText.tsx");

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (
		platform !== "web" &&
		moduleName === "./Libraries/Text/Text" &&
		context.originModulePath.endsWith(RN_INDEX)
	) {
		return { type: "sourceFile", filePath: APP_TEXT };
	}
	return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
