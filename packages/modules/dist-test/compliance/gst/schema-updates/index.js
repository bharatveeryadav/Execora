"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_GSTN_SCHEMA_VERSION = void 0;
exports.getLatestSchemaVersion = getLatestSchemaVersion;
exports.CURRENT_GSTN_SCHEMA_VERSION = "1.1";
async function getLatestSchemaVersion() {
    return {
        version: exports.CURRENT_GSTN_SCHEMA_VERSION,
        effectiveFrom: "2024-01-01",
        changeLog: ["Initial version"],
    };
}
//# sourceMappingURL=index.js.map