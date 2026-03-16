/**
 * StatusBadge — paid/pending/partial/cancelled/draft (Sprint 2).
 */
import React from "react";
import { Badge } from "../ui/Badge";

type InvoiceStatus = "paid" | "pending" | "partial" | "cancelled" | "draft";

const statusVariant: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  paid: "success",
  pending: "warning",
  partial: "info",
  cancelled: "danger",
  draft: "muted",
};

export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = (status ?? "").toLowerCase();
  const variant = statusVariant[s] ?? "muted";
  return <Badge variant={variant}>{s || "—"}</Badge>;
}
