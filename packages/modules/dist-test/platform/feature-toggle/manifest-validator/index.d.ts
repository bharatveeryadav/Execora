/**
 * platform/feature-toggle/manifest-validator
 *
 * Feature: module entitlement validation — verify tenant's plan allows a feature.
 */
export interface ManifestValidationResult {
    feature: string;
    allowed: boolean;
    reason?: string;
    upgradeRequired?: string;
}
export declare function validateFeatureAccess(_tenantId: string, _feature: string): Promise<ManifestValidationResult>;
export declare function validateBulkFeatures(_tenantId: string, _features: string[]): Promise<ManifestValidationResult[]>;
//# sourceMappingURL=index.d.ts.map