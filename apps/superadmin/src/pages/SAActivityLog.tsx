import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { saGetActivity, SAActivityEntry } from "@/lib/sa-api";
import {
  SAPage, SATable, TR, TD, Pagination, SALoading, SAError,
} from "@/components/SALayout";
import { formatDistanceToNow } from "date-fns";

export default function SAActivityLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-activity", page, action],
    queryFn: () => saGetActivity({ page, action: action || undefined }),
    placeholderData: (p) => p,
  });

  return (
    <SAPage title="Activity Log" subtitle="All platform-level events and actions">
      <div className="flex flex-wrap gap-2">
        <input
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          placeholder="Filter by action…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-amber-500 placeholder:text-gray-500"
        />
      </div>

      {isLoading && <SALoading />}
      {error && <SAError msg={String(error)} />}

      {data && (
        <>
          <SATable heads={["Action", "Entity", "Tenant", "User", "IP", "When"]}>
            {data.data.map((e: SAActivityEntry) => (
              <TR key={e.id}>
                <TD>
                  <span className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                    {e.action}
                  </span>
                </TD>
                <TD>
                  <div className="text-xs text-gray-300">{e.entityType}</div>
                  <div className="text-xs text-gray-600 font-mono">{e.entityId.slice(0, 8)}…</div>
                </TD>
                <TD className="text-xs text-gray-400">
                  {e.tenant?.name ?? <span className="text-gray-600">—</span>}
                </TD>
                <TD className="text-xs text-gray-400">
                  {e.user ? (
                    <div>
                      <div>{e.user.name}</div>
                      <div className="text-gray-600">{e.user.email}</div>
                    </div>
                  ) : <span className="text-gray-600">—</span>}
                </TD>
                <TD className="text-xs text-gray-600 font-mono">{e.ipAddress ?? "—"}</TD>
                <TD className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </TD>
              </TR>
            ))}
          </SATable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} entries</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </SAPage>
  );
}
