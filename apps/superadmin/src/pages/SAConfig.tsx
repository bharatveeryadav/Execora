import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { saGetConfig, saPutConfig, saResetConfig } from "@/lib/sa-api";
import { SAPage } from "@/components/SALayout";
import { RotateCcw, Save } from "lucide-react";

export default function SAConfig() {
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["sa-config"],
    queryFn: saGetConfig,
  });

  useEffect(() => {
    if (data) setJson(JSON.stringify(data, null, 2));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(json);
      return saPutConfig(parsed);
    },
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); refetch(); },
  });

  const resetMut = useMutation({
    mutationFn: saResetConfig,
    onSuccess: () => refetch(),
  });

  function handleSave() {
    setJsonError("");
    try {
      JSON.parse(json);
      saveMut.mutate();
    } catch {
      setJsonError("Invalid JSON — please fix before saving.");
    }
  }

  return (
    <SAPage
      title="Platform Config"
      subtitle="Live configuration for the Execora platform"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Reset to defaults? This cannot be undone.")) resetMut.mutate();
            }}
            disabled={resetMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 rounded-md transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saveMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "Saved!" : saveMut.isPending ? "Saving…" : "Save Config"}
          </button>
        </div>
      }
    >
      {jsonError && (
        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{jsonError}</p>
      )}
      {saveMut.error && (
        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{String(saveMut.error)}</p>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-gray-500 font-mono">config.json</span>
          <span className="text-xs text-gray-600">Edit below and click Save</span>
        </div>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={24}
          spellCheck={false}
          className="w-full bg-transparent text-green-300 font-mono text-sm px-4 py-3 focus:outline-none resize-none"
        />
      </div>
    </SAPage>
  );
}
