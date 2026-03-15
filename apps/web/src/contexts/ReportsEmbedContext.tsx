/**
 * When reports are shown inline (sidebar + content), embedded pages use onBack
 * instead of navigate("/") so we stay within Reports.
 */
import { createContext, useContext } from "react";

export interface ReportsEmbedContextValue {
  onBack: () => void;
}

export const ReportsEmbedContext =
  createContext<ReportsEmbedContextValue | null>(null);

export function useReportsEmbed() {
  return useContext(ReportsEmbedContext);
}
