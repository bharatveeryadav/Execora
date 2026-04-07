/**
 * compliance/gst/schema-updates
 *
 * Feature: track and apply GSTN schema version changes.
 * Stub — automated schema sync is planned (⏳).
 */
export interface GstnSchemaVersion {
  version: string;
  effectiveFrom: string;
  changeLog: string[];
}
export const CURRENT_GSTN_SCHEMA_VERSION = "1.1";
export async function getLatestSchemaVersion(): Promise<GstnSchemaVersion> {
  return {
    version: CURRENT_GSTN_SCHEMA_VERSION,
    effectiveFrom: "2024-01-01",
    changeLog: ["Initial version"],
  };
}
