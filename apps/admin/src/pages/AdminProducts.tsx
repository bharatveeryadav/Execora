import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetProducts, adminGetLowStock } from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-products", page, q],
    queryFn: () => adminGetProducts({ page, q: q || undefined }),
    placeholderData: (prev) => prev,
    enabled: !showLowStock,
  });

  const { data: lowStock, isLoading: lsLoading } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => adminGetLowStock(5),
    enabled: showLowStock,
  });

  const products = showLowStock ? lowStock?.data : data?.data;
  const loading = showLowStock ? lsLoading : isLoading;

  return (
    <AdminPage
      title="Products"
      subtitle="Catalog management"
      actions={
        <button
          onClick={() => setShowLowStock((v) => !v)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            showLowStock
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {showLowStock ? "Show All" : "Low Stock Alert"}
        </button>
      }
    >
      {!showLowStock && (
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search products…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
        />
      )}

      {loading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {showLowStock && lowStock && (
        <p className="text-xs text-orange-400">
          {lowStock.data.length} products with stock ≤ {lowStock.threshold} units
        </p>
      )}

      {products && (
        <>
          <AdminTable heads={["Name", "Category", "Price (₹)", "Stock", "Unit", "GST %"]}>
            {products.map((p) => (
              <TR key={p.id}>
                <TD><span className="font-medium text-white">{p.name}</span></TD>
                <TD className="text-xs text-gray-400">{p.category ?? "—"}</TD>
                <TD>₹{Number(p.price).toLocaleString("en-IN")}</TD>
                <TD className={p.stock <= 5 ? "text-red-300 font-medium" : "text-white"}>
                  {p.stock}
                </TD>
                <TD className="text-xs text-gray-400">{p.unit}</TD>
                <TD className="text-xs text-gray-400">{p.gstRate ?? 0}%</TD>
              </TR>
            ))}
          </AdminTable>
          {!showLowStock && data && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{data.meta.total} products</p>
              <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
}
