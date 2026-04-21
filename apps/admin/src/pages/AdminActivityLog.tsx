import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetActivity, AdminActivityEntry } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";
import { formatDistanceToNow } from "date-fns";

const ACTION_OPTIONS = [
  "", "create", "update", "delete", "login", "logout", "export", "import",
];
const ENTITY_OPTIONS = [
  "", "invoice", "customer", "product", "payment", "reminder", "user", "tenant",
];

export default function AdminActivityLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-activity", page, action, entityType, tenantSearch],
    queryFn: () =>
      adminGetActivity({
        page,
        limit: 50,
        action: action || undefined,
        entityType: entityType || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const filtered = data?.data?.filter((e: AdminActivityEntry) =>
    !tenantSearch ||
    e.tenant?.id?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    e.tenant?.name?.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <AdminPage
      title="Activity Log"
      subtitle="Cross-tenant audit trail"
    >
      <div className="flex flex-wrap gap-2">
        <input
          value={tenantSearch}
          onChange={(e) => setTenantSearch(e.target.value)}
          placeholder="Filter by tenant…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a === "" ? "All Actions" : a}</option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>{e === "" ? "All Entities" : e}</option>
          ))}
        </select>
      </div>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Action", "Entity", "Entity ID", "Tenant", "User", "IP", "When"]}>
            {(filtered ?? data.data).map((e: AdminActivityEntry) => (
              <TR key={e.id}>
                <TD><Badge value={e.action} /></TD>
                <TD>
                  <span className="text-xs capitalize text-gray-300">{e.entityType}</span>
                </TD>
                <TD>
                  <span className="text-xs font-mono text-gray-500">
                    {e.entityId ? e.entityId.slice(0, 12) + "…" : "—"}
                  </span>
                </TD>
                <TD>
                  <div className="text-sm text-gray-300">{e.tenant?.name ?? "—"}</div>
                  <div className="text-xs text-gray-600 font-mono">{e.tenant?.id?.slice(0, 8)}…</div>
                </TD>
                <TD>
                  <div className="text-sm text-gray-300">{e.user?.name ?? "—"}</div>
                  {e.user?.email && <div className="text-xs text-gray-500">{e.user.email}</div>}
                </TD>
                <TD className="text-xs text-gray-500 font-mono">{e.ipAddress ?? "—"}</TD>
                <TD className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} entries total</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
