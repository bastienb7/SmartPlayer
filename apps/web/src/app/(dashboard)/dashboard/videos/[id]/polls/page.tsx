"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2, Save, Loader2, Check, AlertCircle, GripVertical } from "lucide-react";
import { api } from "@/lib/api-client";

interface PollOption {
  id: string;
  text: string;
  color: string;
}

interface Poll {
  id: string;
  question: string;
  type: "single" | "multiple";
  showAtTimestamp: number;
  pauseVideo: boolean;
  showResults: boolean;
  options: PollOption[];
}

interface PollsConfig {
  enabled: boolean;
  polls: Poll[];
}

const defaultColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function PollsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<PollsConfig>({ enabled: false, polls: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const p = player.pollsConfig;
        if (p && typeof p === "object" && Object.keys(p).length > 0) {
          setConfig({ enabled: p.enabled ?? false, polls: p.polls || [] });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await api.updatePlayerConfig(id, { pollsConfig: config });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const addPoll = () => {
    setConfig((c) => ({
      ...c,
      polls: [...c.polls, {
        id: `poll-${Date.now()}`,
        question: "What do you think?",
        type: "single",
        showAtTimestamp: 0,
        pauseVideo: true,
        showResults: true,
        options: [
          { id: `opt-${Date.now()}-1`, text: "Option A", color: defaultColors[0] },
          { id: `opt-${Date.now()}-2`, text: "Option B", color: defaultColors[1] },
        ],
      }],
    }));
  };

  const updatePoll = (pollId: string, updates: Partial<Poll>) => {
    setConfig((c) => ({ ...c, polls: c.polls.map((p) => p.id === pollId ? { ...p, ...updates } : p) }));
  };

  const deletePoll = (pollId: string) => {
    setConfig((c) => ({ ...c, polls: c.polls.filter((p) => p.id !== pollId) }));
  };

  const addOption = (pollId: string) => {
    setConfig((c) => ({
      ...c,
      polls: c.polls.map((p) => {
        if (p.id !== pollId) return p;
        const colorIdx = p.options.length % defaultColors.length;
        return { ...p, options: [...p.options, { id: `opt-${Date.now()}`, text: `Option ${String.fromCharCode(65 + p.options.length)}`, color: defaultColors[colorIdx] }] };
      }),
    }));
  };

  const updateOption = (pollId: string, optId: string, updates: Partial<PollOption>) => {
    setConfig((c) => ({
      ...c,
      polls: c.polls.map((p) => p.id !== pollId ? p : { ...p, options: p.options.map((o) => o.id === optId ? { ...o, ...updates } : o) }),
    }));
  };

  const deleteOption = (pollId: string, optId: string) => {
    setConfig((c) => ({
      ...c,
      polls: c.polls.map((p) => p.id !== pollId ? p : { ...p, options: p.options.filter((o) => o.id !== optId) }),
    }));
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Interactive Polls
          </h1>
          <p className="text-muted-foreground">Add polls during video playback to boost engagement and collect feedback.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addPoll}><Plus className="w-4 h-4 mr-2" /> Add Poll</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {/* Enable toggle */}
      <Card className="mb-6">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm">Enable Polls</div>
            <div className="text-xs text-muted-foreground">Show interactive polls during video playback</div>
          </div>
          <button onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))} className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </Card>

      {config.enabled && (
        <>
          {config.polls.length === 0 ? (
            <Card className="border-dashed">
              <div className="flex flex-col items-center gap-4 py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">No polls yet. Add one to get started.</p>
                <Button onClick={addPoll}><Plus className="w-4 h-4 mr-2" /> Add Poll</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {config.polls.map((poll, pollIndex) => (
                <Card key={poll.id}>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="info">Poll #{pollIndex + 1}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => deletePoll(poll.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <div className="text-xs text-muted-foreground mb-2">Preview</div>
                    <div className="bg-black/80 rounded-lg p-6 max-w-sm mx-auto">
                      <p className="text-white text-sm font-semibold text-center mb-4">{poll.question || "Your question?"}</p>
                      <div className="space-y-2">
                        {poll.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors cursor-pointer" style={{ borderLeftColor: opt.color, borderLeftWidth: 3 }}>
                            <span className="text-white text-xs">{opt.text || "Option"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-0 space-y-4">
                    {/* Question */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Question</label>
                      <Input value={poll.question} onChange={(e) => updatePoll(poll.id, { question: e.target.value })} placeholder="What do you think about...?" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Show at (seconds)</label>
                        <Input type="number" value={poll.showAtTimestamp} onChange={(e) => updatePoll(poll.id, { showAtTimestamp: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Type</label>
                        <select value={poll.type} onChange={(e) => updatePoll(poll.id, { type: e.target.value as "single" | "multiple" })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="single">Single choice</option>
                          <option value="multiple">Multiple choice</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2 pt-6">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={poll.pauseVideo} onChange={(e) => updatePoll(poll.id, { pauseVideo: e.target.checked })} className="rounded" />
                          Pause video
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={poll.showResults} onChange={(e) => updatePoll(poll.id, { showResults: e.target.checked })} className="rounded" />
                          Show results
                        </label>
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Options</label>
                      <div className="space-y-2">
                        {poll.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input type="color" value={opt.color} onChange={(e) => updateOption(poll.id, opt.id, { color: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer" />
                            <Input value={opt.text} onChange={(e) => updateOption(poll.id, opt.id, { text: e.target.value })} className="flex-1" placeholder="Option text" />
                            {poll.options.length > 2 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteOption(poll.id, opt.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => addOption(poll.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
