import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetInvoices } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

const STATUSES = ["", "draft", "pending", "partial", "paid", "cancelled"];

export default function AdminInvoices() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-invoices", page, status],
    queryFn: () => adminGetInvoices({ page, status: status || undefined }),
    placeholderData: (prev) => prev,
  });

  return (
    <AdminPage title="Invoices" subtitle="All invoices">
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
      </select>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Invoice No", "Customer", "Total (₹)", "Status", "Items", "Date"]}>
            {data.data.map((inv) => (
              <TR key={inv.id}>
                <TD><span className="font-mono text-xs text-white">{inv.invoiceNo}</span></TD>
                <TD>
                  <div className="text-white">{inv.customer.name}</div>
                  <div className="text-xs text-gray-500">{inv.customer.phone}</div>
                </TD>
                <TD className="font-medium text-white">₹{Number(inv.total).toLocaleString("en-IN")}</TD>
                <TD><Badge value={inv.status} /></TD>
                <TD className="text-xs text-gray-400">{(inv as any)._count?.items ?? "—"}</TD>
                <TD className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} invoices</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
