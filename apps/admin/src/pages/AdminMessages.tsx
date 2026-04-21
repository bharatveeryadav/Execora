import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetMessageLogs } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

export default function AdminMessages() {
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-messages", page, channel],
    queryFn: () => adminGetMessageLogs({ page, channel: channel || undefined }),
    placeholderData: (prev) => prev,
  });

  return (
    <AdminPage title="Message Logs" subtitle="WhatsApp & SMS delivery logs">
      <select
        value={channel}
        onChange={(e) => { setChannel(e.target.value); setPage(1); }}
        className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
      >
        {["", "whatsapp", "sms", "email"].map((s) => (
          <option key={s} value={s}>{s || "All channels"}</option>
        ))}
      </select>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Customer", "Channel", "Recipient", "Status", "Error", "Sent"]}>
            {data.data.map((m) => (
              <TR key={m.id}>
                <TD className="text-white">{m.customer?.name ?? "—"}</TD>
                <TD><Badge value={m.channel} /></TD>
                <TD className="text-xs text-gray-400 font-mono">{m.recipient}</TD>
                <TD><Badge value={m.status} /></TD>
                <TD className="text-xs text-red-400 max-w-xs truncate">{m.errorMessage ?? "—"}</TD>
                <TD className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString("en-IN")}</TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} logs</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
