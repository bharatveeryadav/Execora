import { useQuery } from "@tanstack/react-query";
import { cashbookApi, reportsApi, summaryApi } from "../api/accountingApi";

export function useCashbookData(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["cashbook", params.from, params.to],
    queryFn: () => cashbookApi.get(params),
    staleTime: 60_000,
  });
}

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: ["summary-daily", date],
    queryFn: () => summaryApi.daily(date),
    staleTime: 60_000,
  });
}

export function useSummaryRange(from: string, to: string) {
  return useQuery({
    queryKey: ["summary-range", from, to],
    queryFn: () => summaryApi.range(from, to),
    staleTime: 60_000,
    enabled: !!from && !!to,
  });
}

export function useGstr1Report(params?: {
  from?: string;
  to?: string;
  fy?: string;
}) {
  return useQuery({
    queryKey: ["gstr1", params?.from, params?.to, params?.fy],
    queryFn: () => reportsApi.gstr1(params),
    staleTime: 5 * 60_000,
  });
}

export function usePnLReport(params?: {
  from?: string;
  to?: string;
  fy?: string;
}) {
  return useQuery({
    queryKey: ["pnl", params?.from, params?.to, params?.fy],
    queryFn: () => reportsApi.pnl(params),
    staleTime: 5 * 60_000,
  });
}

/** Convenience hook: fetches cashbook + summary + PnL for a date range in parallel. */
export function useAccountingQueries(from: string, to: string) {
  const cashbook = useCashbookData({ from, to });
  const summary = useSummaryRange(from, to);
  const pnl = usePnLReport({ from, to });
  return { cashbook, summary, pnl };
}
