const path = require("path");
const {
    getDefaultConfig
} = require("expo/metro-config");
const {
    withNativeWind
} = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all workspace packages and root node_modules
config.watchFolders = [
    workspaceRoot,
];

// Resolve modules from the local app first, then workspace root
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// Force single instance (fixes duplicate native views + Invalid hook call)
const reactRoot = path.resolve(workspaceRoot, "node_modules/react");
const reactDomRoot = path.resolve(workspaceRoot, "node_modules/react-dom");
const safeAreaRoot = path.resolve(workspaceRoot, "node_modules/react-native-safe-area-context");
config.resolver.extraNodeModules = {
    react: reactRoot,
    "react-dom": reactDomRoot,
    "react-native-safe-area-context": safeAreaRoot,
};
// Ensure extraNodeModules paths are watched
config.watchFolders = [...(config.watchFolders || []), reactRoot, reactDomRoot, safeAreaRoot];

// Resolve workspace packages (@execora/*) from their TypeScript sources directly
const fs = require("fs");
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Fix: react-native-reanimated@3.16.x ships no index.web.js — Metro ENOENT on web platform
    if (platform === "web" && moduleName === "react-native-reanimated") {
        const fp = path.resolve(workspaceRoot, "node_modules/react-native-reanimated/lib/module/index.js");
        if (fs.existsSync(fp)) return {
            type: "sourceFile",
            filePath: fp
        };
    }
    // Force react-native-safe-area-context to workspace root (fixes RNCSafeAreaProvider duplicate)
    if (moduleName === "react-native-safe-area-context") {
        const fp = path.join(safeAreaRoot, "lib/commonjs/index.js");
        if (fs.existsSync(fp)) return {
            type: "sourceFile",
            filePath: fp
        };
    }
    // Force react/react-dom to workspace root (fixes multiple React copies)
    if (moduleName === "react" || moduleName === "react/jsx-runtime" || moduleName === "react/jsx-dev-runtime") {
        const sub = moduleName === "react" ? "index.js" : moduleName.replace("react/", "") + ".js";
        const fp = path.join(reactRoot, sub);
        if (fs.existsSync(fp)) return {
            type: "sourceFile",
            filePath: fp
        };
    }
    if (moduleName === "react-dom" || moduleName === "react-dom/client") {
        const sub = moduleName === "react-dom" ? "index.js" : "client.js";
        const fp = path.join(reactDomRoot, sub);
        if (fs.existsSync(fp)) return {
            type: "sourceFile",
            filePath: fp
        };
    }
    // Fix: expo-notifications nested expo looks for old EventEmitter path
    if (moduleName === "expo-modules-core/build/EventEmitter") {
        const resolved = path.resolve(workspaceRoot, "node_modules/expo-modules-core/src/EventEmitter.ts");
        if (fs.existsSync(resolved)) {
            return {
                type: "sourceFile",
                filePath: resolved
            };
        }
    }
    if (moduleName.startsWith("@execora/")) {
        const pkgName = moduleName.replace("@execora/", "");
        const pkgRoot = path.resolve(workspaceRoot, "packages", pkgName);
        const pkgJson = path.resolve(pkgRoot, "package.json");
        if (fs.existsSync(pkgJson)) {
            const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
            const source = pkg.source;
            if (source) {
                return {
                    type: "sourceFile",
                    filePath: path.resolve(pkgRoot, source)
                };
            }
        }
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Ensure .ts/.tsx are in source extensions
const defaultSourceExts = config.resolver.sourceExts || [];
config.resolver.sourceExts = [...new Set([...defaultSourceExts, "ts", "tsx", "mts"])];

module.exports = withNativeWind(config, {
    input: "./src/global.css",
    projectRoot: path.resolve(__dirname),
});