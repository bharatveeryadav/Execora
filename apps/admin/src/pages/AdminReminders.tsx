import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetReminders } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

export default function AdminReminders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reminders", page, status],
    queryFn: () => adminGetReminders({ page, status: status || undefined }),
    placeholderData: (prev) => prev,
  });

  return (
    <AdminPage title="Reminders" subtitle="All scheduled reminders">
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
      >
        {["", "pending", "sent", "failed"].map((s) => (
          <option key={s} value={s}>{s || "All statuses"}</option>
        ))}
      </select>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Customer", "Type", "Status", "Scheduled"]}>
            {data.data.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="font-medium text-white">{r.customer.name}</div>
                  <div className="text-xs text-gray-500">{r.customer.phone}</div>
                </TD>
                <TD className="text-xs text-gray-400 capitalize">{r.reminderType}</TD>
                <TD><Badge value={r.status} /></TD>
                <TD className="text-xs text-gray-400">{new Date(r.scheduledTime).toLocaleString("en-IN")}</TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} reminders</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
