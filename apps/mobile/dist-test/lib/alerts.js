"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSuccess = showSuccess;
exports.showAlert = showAlert;
exports.showInfo = showInfo;
exports.showError = showError;
exports.showErrorFromUnknown = showErrorFromUnknown;
const react_native_1 = require("react-native");
function asErrorMessage(error, fallback) {
    if (!error)
        return fallback;
    if (typeof error === "string")
        return error;
    if (typeof error === "object") {
        const maybeMessage = error.message;
        if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
            return maybeMessage;
        }
        const maybeError = error.error;
        if (typeof maybeError === "string" && maybeError.trim().length > 0) {
            return maybeError;
        }
    }
    return fallback;
}
function showSuccess(message, title = "") {
    react_native_1.Alert.alert(title, message);
}
function showAlert(title, message, buttons, options) {
    react_native_1.Alert.alert(title, message, buttons, options);
}
function showInfo(message, title = "") {
    react_native_1.Alert.alert(title, message);
}
function showError(message, title = "Error") {
    react_native_1.Alert.alert(title, message);
}
function showErrorFromUnknown(error, fallback = "Something went wrong", title = "Error") {
    react_native_1.Alert.alert(title, asErrorMessage(error, fallback));
}
//# sourceMappingURL=alerts.js.map