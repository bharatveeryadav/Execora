/**
 * sales/pos/session/multi-counter
 *
 * Feature: parallel counter support — manage multiple simultaneous POS counters per tenant.
 */
export interface Counter {
  id: string;
  tenantId: string;
  name: string;
  locationId?: string;
  active: boolean;
}

export async function listCounters(_tenantId: string): Promise<Counter[]> {
  return [];
}

export async function createCounter(
  _tenantId: string,
  _name: string,
  _locationId?: string,
): Promise<Counter> {
  throw new Error("Not implemented");
}
