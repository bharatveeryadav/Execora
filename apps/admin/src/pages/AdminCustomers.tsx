import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetCustomers } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-customers", page, q],
    queryFn: () => adminGetCustomers({ page, q: q || undefined }),
    placeholderData: (prev) => prev,
  });

  return (
    <AdminPage title="Customers" subtitle="All customers">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
        placeholder="Search by name or phone…"
        className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
      />

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Name", "Phone", "Balance (₹)", "Total Purchases", "Total Payments", "Since"]}>
            {data.data.map((c) => (
              <TR key={c.id}>
                <TD><span className="font-medium text-white">{c.name}</span></TD>
                <TD className="text-xs text-gray-400">{c.phone ?? "—"}</TD>
                <TD className={Number(c.balance) > 0 ? "text-red-300 font-medium" : "text-gray-400"}>
                  ₹{Number(c.balance).toLocaleString("en-IN")}
                </TD>
                <TD>₹{Number(c.totalPurchases).toLocaleString("en-IN")}</TD>
                <TD>₹{Number(c.totalPayments).toLocaleString("en-IN")}</TD>
                <TD className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString("en-IN")}</TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} customers</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}
    </AdminPage>
  );
}
