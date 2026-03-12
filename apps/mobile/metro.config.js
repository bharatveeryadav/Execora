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

// Resolve workspace packages (@execora/*) from their TypeScript sources directly
const fs = require("fs");
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
    input: "./src/global.css"
});