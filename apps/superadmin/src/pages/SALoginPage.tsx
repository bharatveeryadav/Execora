import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSAAuth } from "@/contexts/SAAuthContext";
import { Crown } from "lucide-react";

export default function SALoginPage() {
  const { login } = useSAAuth();
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
    if (ok) navigate("/overview");
    else setError("Invalid key — check your ADMIN_API_KEY in .env");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
            <Crown className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-sm text-amber-400/70 mt-1">Execora Platform Control</p>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Restricted access — platform owners only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Platform Admin Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="your-platform-admin-key"
              required
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder:text-gray-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "Verifying…" : "Access Super Admin"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          For dev: key is in <code className="text-gray-500">.env → ADMIN_API_KEY</code>
        </p>
      </div>
    </div>
  );
}
