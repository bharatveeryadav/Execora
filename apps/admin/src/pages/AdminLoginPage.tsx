import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [key, setKey] = useState(import.meta.env.VITE_ADMIN_API_KEY ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(key.trim());
    setLoading(false);
    if (ok) navigate("/dashboard");
    else setError("Invalid admin key — check your ADMIN_API_KEY in .env");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Execora Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your admin API key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Admin API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="your-admin-api-key"
              required
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 placeholder:text-gray-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          For dev: key is in <code className="text-gray-500">.env → ADMIN_API_KEY</code>
        </p>
      </div>
    </div>
  );
}
