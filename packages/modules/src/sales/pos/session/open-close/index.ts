/**
 * sales/pos/session/open-close
 *
 * Feature: counter session open/close — opening cash, closing reconciliation, Z-report.
 */
export interface CounterSession {
  id: string;
  tenantId: string;
  counterId: string;
  openedBy: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  status: "open" | "closed";
}

export async function openCounterSession(
  _tenantId: string,
  _counterId: string,
  _openedBy: string,
  _openingCash: number,
): Promise<CounterSession> {
  throw new Error("Not implemented");
}

export async function closeCounterSession(
  _sessionId: string,
  _closingCash: number,
): Promise<CounterSession> {
  throw new Error("Not implemented");
}

export async function getActiveSession(
  _tenantId: string,
  _counterId: string,
): Promise<CounterSession | null> {
  return null;
}
