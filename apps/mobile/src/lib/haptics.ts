/**
 * Haptic feedback helpers (Sprint 19).
 * Light: buttons, selections. Success: save/record. Error: failures.
 */
import * as Haptics from "expo-haptics";

export function hapticLight() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function hapticSuccess() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function hapticError() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function hapticSelection() {
  try {
    Haptics.selectionAsync();
  } catch {
    // Ignore on unsupported platforms
  }
}
