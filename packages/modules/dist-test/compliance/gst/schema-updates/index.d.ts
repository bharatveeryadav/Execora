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
export declare const CURRENT_GSTN_SCHEMA_VERSION = "1.1";
export declare function getLatestSchemaVersion(): Promise<GstnSchemaVersion>;
//# sourceMappingURL=index.d.ts.map