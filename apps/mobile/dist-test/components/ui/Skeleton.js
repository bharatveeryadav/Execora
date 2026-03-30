"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skeleton = Skeleton;
/**
 * Skeleton — design system component (Sprint 2).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
function Skeleton({ className, ...props }) {
    const opacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0.3)).current;
    (0, react_1.useEffect)(() => {
        const anim = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(opacity, {
                toValue: 0.6,
                duration: 600,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(opacity, {
                toValue: 0.3,
                duration: 600,
                useNativeDriver: true,
            }),
        ]));
        anim.start();
        return () => anim.stop();
    }, []);
    return (react_1.default.createElement(react_native_1.Animated.View, { className: (0, utils_1.cn)("rounded-lg bg-slate-200", className), style: { opacity }, ...props }));
}
//# sourceMappingURL=Skeleton.js.map