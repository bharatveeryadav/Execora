"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWarehouseLocations = listWarehouseLocations;
exports.createWarehouseLocation = createWarehouseLocation;
async function listWarehouseLocations(_tenantId) {
    return [];
}
async function createWarehouseLocation(input) {
    return { ...input, id: `WL-${Date.now()}` };
}
//# sourceMappingURL=locations.js.map