import { Alert, type AlertButton, type AlertOptions } from "react-native";

type MaybeError = unknown;

function asErrorMessage(error: MaybeError, fallback: string): string {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeError = (error as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      return maybeError;
    }
  }

  return fallback;
}

export function showSuccess(message: string, title = "") {
  Alert.alert(title, message);
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  Alert.alert(title, message, buttons, options);
}

export function showInfo(message: string, title = "") {
  Alert.alert(title, message);
}

export function showError(message: string, title = "Error") {
  Alert.alert(title, message);
}

export function showErrorFromUnknown(
  error: MaybeError,
  fallback = "Something went wrong",
  title = "Error",
) {
  Alert.alert(title, asErrorMessage(error, fallback));
}
