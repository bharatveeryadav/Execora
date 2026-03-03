import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts:
 *   n → new invoice (dispatches CustomEvent so BottomNav/QuickActions can open dialog)
 *   p → /payment
 *   i → /inventory
 *   r → /reports
 *   ? → show shortcuts help modal (dispatches event)
 *   Escape → go home
 *
 * All shortcuts are suppressed when focus is inside an input, textarea, or select.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Skip modifier combos (Ctrl+K handled separately by GlobalSearch)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("shortcut:new-invoice"));
          break;
        case "p":
          e.preventDefault();
          navigate("/payment");
          break;
        case "i":
          e.preventDefault();
          navigate("/inventory");
          break;
        case "r":
          e.preventDefault();
          navigate("/reports");
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("shortcut:help"));
          break;
        case "escape":
          navigate("/");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
