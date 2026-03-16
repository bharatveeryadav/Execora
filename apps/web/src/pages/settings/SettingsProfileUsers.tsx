/**
 * All Users / Roles — team management
 */
import { useState } from "react";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe, useUsers, useCreateUser, useRemoveUser } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

export default function SettingsProfileUsers() {
  const { data: me } = useMe();
  const { data: teamUsers = [], isLoading: usersLoading } = useUsers();
  const createUser = useCreateUser();
  const removeUser = useRemoveUser();
  const { toast } = useToast();

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "staff" | "viewer">("staff");
  const [newPassword, setNewPassword] = useState("");

  function resetAddUser() {
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("staff");
    setNewPassword("");
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 8) {
      toast({ title: "Fill all fields; password ≥ 8 chars", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        password: newPassword,
      });
      toast({ title: `✅ ${newName} added as ${newRole}` });
      resetAddUser();
      setAddUserOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add user";
      toast({ title: "❌ " + msg, variant: "destructive" });
    }
  }

  async function handleRemoveUser(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will lose access immediately.`)) return;
    try {
      await removeUser.mutateAsync(id);
      toast({ title: `${name} removed` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove user";
      toast({ title: "❌ " + msg, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-base font-semibold mb-3">Team Members</h2>
        {usersLoading && (
          <p className="text-xs text-muted-foreground">Loading users…</p>
        )}
        <div className="space-y-2">
          {teamUsers.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.name}
                    {isMe && <span className="ml-1 text-muted-foreground">(You)</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {u.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                  </div>
                </div>
                {!isMe && (
                  <button
                    onClick={() => handleRemoveUser(u.id, u.name)}
                    className="ml-2 shrink-0 rounded p-1.5 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                    title="Remove user"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {teamUsers.length === 0 && !usersLoading && (
          <p className="text-xs text-muted-foreground">No staff accounts yet.</p>
        )}
        <div className="flex gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => setAddUserOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Add User
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ShieldCheck className="mr-1.5 h-4 w-4" /> Manage Roles
          </Button>
        </div>
      </div>

      <Dialog
        open={addUserOpen}
        onOpenChange={(v) => {
          setAddUserOpen(v);
          if (!v) resetAddUser();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Staff Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ramesh Kumar"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@yourbusiness.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager — full access except settings</SelectItem>
                  <SelectItem value="staff">Staff — billing + inventory</SelectItem>
                  <SelectItem value="viewer">Viewer — read-only reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temporary Password * (min 8 chars)</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                They can change it after first login.
              </p>
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Adding…" : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
