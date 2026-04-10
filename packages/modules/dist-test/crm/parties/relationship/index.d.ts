/**
 * crm/parties/relationship
 *
 * Feature: party relationship graph — parent/child accounts, contact hierarchy.
 */
export interface PartyRelationship {
    parentId: string;
    childId: string;
    type: "subsidiary" | "branch" | "contact" | "associate";
}
export declare function getPartyRelationships(_partyId: string): Promise<PartyRelationship[]>;
export declare function linkParties(_parentId: string, _childId: string, _type: PartyRelationship["type"]): Promise<void>;
export declare function unlinkParties(_parentId: string, _childId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map