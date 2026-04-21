import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saSendPlatformEmail, saGetPlatformEmails, SAPlatformEmail } from "@/lib/sa-api";
import { SAPage, SATable, TR, TD, SALoading, SAError } from "@/components/SALayout";

export default function SAComms() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-platform-emails"],
    queryFn: saGetPlatformEmails,
  });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sentTo, setSentTo] = useState("");
  const mut = useMutation({
    mutationFn: () => saSendPlatformEmail(subject, body, sentTo.split(/[,;\s]+/).filter(Boolean)),
    onSuccess: () => { setSubject(""); setBody(""); setSentTo(""); qc.invalidateQueries({ queryKey: ["sa-platform-emails"] }); },
  });
  return (
    <SAPage title="Platform Email" subtitle="Send and view platform-wide emails">
      <form
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 flex flex-col gap-3"
        onSubmit={e => { e.preventDefault(); mut.mutate(); }}
      >
        <div>
          <label className="block text-xs text-gray-400 mb-1">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} required minLength={3}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} required minLength={3}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[80px]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Recipients (comma/space separated emails)</label>
          <input value={sentTo} onChange={e => setSentTo(e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="submit" disabled={mut.isPending}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40">
            {mut.isPending ? "Sending…" : "Send Email"}
          </button>
        </div>
        {mut.isError && <p className="text-red-400 text-xs mt-2">{(mut.error as Error).message}</p>}
      </form>
      <h2 className="text-base font-semibold text-white mb-2">Recent Emails</h2>
      {isLoading && <SALoading />}
      {error && <SAError msg={(error as Error).message} />}
      {data && (
        <SATable heads={["Subject", "Recipients", "Sent By", "Sent At"]}>
          {data.data.map((e: SAPlatformEmail) => (
            <TR key={e.id}>
              <TD>{e.subject}</TD>
              <TD className="text-xs text-gray-400">{e.sentTo.join(", ")}</TD>
              <TD>{e.sentBy}</TD>
              <TD className="text-xs text-gray-400">{new Date(e.sentAt).toLocaleString()}</TD>
            </TR>
          ))}
        </SATable>
      )}
    </SAPage>
  );
}
