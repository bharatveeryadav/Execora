import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetPayments, adminGetPaymentSummary } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, StatCard, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

export default function AdminPayments() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payments", page],
    queryFn: () => adminGetPayments({ page }),
    placeholderData: (prev) => prev,
  });
  const { data: summary } = useQuery({
    queryKey: ["admin-payments-summary"],
    queryFn: adminGetPaymentSummary,
  });

  return (
    <AdminPage title="Payments" subtitle="Payment transactions">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Amount" value={`₹${Number(summary.total.amount).toLocaleString("en-IN")}`} color="green" />
          <StatCard label="Total Transactions" value={summary.total.count} color="blue" />
          {summary.byMethod.slice(0, 2).map((m) => (
            <StatCard key={m.method} label={m.method} value={`₹${Number(m.amount).toLocaleString("en-IN")}`} sub={`${m.count} txns`} color="violet" />
          ))}
        </div>
      )}

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Customer", "Amount (₹)", "Method", "Date"]}>
            {data.data.map((p) => (
              <TR key={p.id}>
                <TD><span className="font-medium text-white">{p.customer.name}</span></TD>
                <TD className="text-green-300 font-medium">₹{Number(p.amount).toLocaleString("en-IN")}</TD>
                <TD className="capitalize text-xs text-gray-400">{p.method}</TD>
                <TD className="text-xs text-gray-500">{new Date(p.receivedAt).toLocaleString("en-IN")}</TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} payments</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
