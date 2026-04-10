"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * platform/index.ts
 *
 * Platform domain — subscription lifecycle, feature toggles, entitlements,
 * usage tracking, tenant configuration, offline sync.
 */
__exportStar(require("./subscription/lifecycle"), exports);
__exportStar(require("./subscription/feature-toggles"), exports);
__exportStar(require("./subscription/entitlements"), exports);
__exportStar(require("./subscription/billing-engine"), exports);
__exportStar(require("./subscription/grace-period"), exports);
__exportStar(require("./usage"), exports);
__exportStar(require("./usage/quotas"), exports);
__exportStar(require("./usage/dashboard"), exports);
__exportStar(require("./product-config"), exports);
__exportStar(require("./offline-sync"), exports);
__exportStar(require("./feature-toggle/manifest-validator"), exports);
__exportStar(require("./sync/device-registry"), exports);
__exportStar(require("./pricing/plans"), exports);
__exportStar(require("./pricing/limits"), exports);
__exportStar(require("./pricing/industry-packs"), exports);
//# sourceMappingURL=index.js.map