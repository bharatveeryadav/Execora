const {
    getDefaultConfig
} = require("expo/metro-config");
const {
    withNativeWind
} = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Support workspace packages (../../packages/*)
config.watchFolders = [
    require("path").resolve(__dirname, "../../packages"),
];

module.exports = withNativeWind(config, {
    input: "./src/global.css"
});