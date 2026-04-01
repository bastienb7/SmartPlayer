"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Trash2, Loader2, AlertCircle, Pencil, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api-client";

const statusBadge: Record<string, { variant: any; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  active: { variant: "success", label: "Active" },
  paused: { variant: "warning", label: "Paused" },
};

const categoryColors: Record<string, string> = {
  hook: "bg-violet-500",
  body: "bg-blue-500",
  cta: "bg-emerald-500",
  bonus: "bg-amber-500",
  custom: "bg-slate-500",
};

export default function FunnelsPage() {
  const router = useRouter();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.getFunnels()
      .then((data) => setFunnels(data.funnels || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await api.createFunnel({ name: newName, description: newDesc });
      router.push(`/dashboard/funnels/${data.funnel.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this funnel? This cannot be undone.")) return;
    try {
      await api.deleteFunnel(id);
      setFunnels(funnels.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {funnels.length === 0 && !showModal ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center max-w-md">
              <p className="font-semibold text-lg mb-2">No funnels created</p>
              <p className="text-sm text-muted-foreground mb-6">
                A funnel chains multiple videos seamlessly — the viewer sees one continuous experience. Maximize engagement and conversions by guiding them through a hook, body, and CTA sequence.
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create my first funnel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Funnels</h1>
              <p className="text-muted-foreground">Multi-video sequences that play seamlessly.</p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Funnel
            </Button>
          </div>

          <div className="grid gap-4">
            {funnels.map((funnel) => {
              const badge = statusBadge[funnel.status] || statusBadge.draft;
              return (
                <Card key={funnel.id} className="hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold truncate">{funnel.name}</h3>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {funnel.step_count || 0} step{(funnel.step_count || 0) !== 1 ? "s" : ""} &middot; {formatDate(funnel.created_at || funnel.createdAt)}
                      </p>
                      {funnel.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{funnel.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/dashboard/funnels/${funnel.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(funnel.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Create Funnel</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowModal(false); setNewName(""); setNewDesc(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Funnel Name *</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., VSL Sequence, Webinar Funnel..."
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What's this funnel for?"
                    className="w-full h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowModal(false); setNewName(""); setNewDesc(""); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
