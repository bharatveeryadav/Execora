import { Prisma } from "@prisma/client";
import type { CreateDraftInput, UpdateDraftInput, ListDraftsInput } from "./types";
export declare function createDraft(tenantId: string, userId: string, input: CreateDraftInput): Promise<{
    tenantId: string;
    id: string;
    status: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue;
    type: string;
    title: string | null;
    confirmedAt: Date | null;
    discardedAt: Date | null;
}>;
export declare function listDrafts(tenantId: string, opts: ListDraftsInput): Promise<{
    drafts: {
        tenantId: string;
        id: string;
        status: string;
        notes: string | null;
        createdBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        data: Prisma.JsonValue;
        type: string;
        title: string | null;
        confirmedAt: Date | null;
        discardedAt: Date | null;
    }[];
    count: number;
}>;
export declare function getDraft(tenantId: string, id: string): Promise<{
    tenantId: string;
    id: string;
    status: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue;
    type: string;
    title: string | null;
    confirmedAt: Date | null;
    discardedAt: Date | null;
} | null>;
export declare function updateDraft(tenantId: string, id: string, patch: UpdateDraftInput): Promise<{
    tenantId: string;
    id: string;
    status: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue;
    type: string;
    title: string | null;
    confirmedAt: Date | null;
    discardedAt: Date | null;
}>;
/** Executes the deferred DB write and marks the draft as confirmed. */
export declare function confirmDraft(tenantId: string, id: string): Promise<{
    draft: {
        tenantId: string;
        id: string;
        status: string;
        notes: string | null;
        createdBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        data: Prisma.JsonValue;
        type: string;
        title: string | null;
        confirmedAt: Date | null;
        discardedAt: Date | null;
    };
    result: unknown;
}>;
export declare function discardDraft(tenantId: string, id: string): Promise<{
    tenantId: string;
    id: string;
    status: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue;
    type: string;
    title: string | null;
    confirmedAt: Date | null;
    discardedAt: Date | null;
}>;
//# sourceMappingURL=draft.d.ts.map