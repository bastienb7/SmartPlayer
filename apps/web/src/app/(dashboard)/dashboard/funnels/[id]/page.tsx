"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Loader2, Check, AlertCircle, Plus, Trash2, ChevronUp, ChevronDown,
  Play, Layers, Copy, Code, X, Trophy,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { api } from "@/lib/api-client";

const categoryStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  hook: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30", label: "Hook" },
  body: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", label: "Body" },
  cta: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "CTA" },
  bonus: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", label: "Bonus" },
  custom: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30", label: "Custom" },
};

export default function FunnelBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [funnel, setFunnel] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepName, setNewStepName] = useState("New Step");
  const [newStepCategory, setNewStepCategory] = useState("custom");

  const reload = () => {
    api.getFunnel(id)
      .then((data) => {
        setFunnel(data.funnel);
        setSteps(data.steps || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  useEffect(() => {
    if (funnel) {
      api.getFunnelEmbed(id).then((d) => setEmbedCode(d.html)).catch(() => {});
    }
  }, [funnel, id]);

  const loadVideos = () => {
    if (videosLoaded) return;
    api.getVideos().then((d) => {
      setVideos((d.videos || []).filter((v: any) => v.status === "ready"));
      setVideosLoaded(true);
    }).catch(() => {});
  };

  const handleSaveFunnel = async () => {
    if (!funnel) return;
    setSaving(true); setError("");
    try {
      await api.updateFunnel(id, {
        name: funnel.name,
        description: funnel.description,
        status: funnel.status,
        combined_progress: funnel.combined_progress,
        preload_seconds: funnel.preload_seconds,
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const addStep = async () => {
    try {
      await api.addFunnelStep(id, { name: newStepName, category: newStepCategory, sort_order: steps.length });
      setShowAddStep(false); setNewStepName("New Step"); setNewStepCategory("custom");
      reload();
    } catch (err: any) { setError(err.message); }
  };

  const deleteStep = async (stepId: string) => {
    try { await api.deleteFunnelStep(stepId); reload(); }
    catch (err: any) { setError(err.message); }
  };

  const moveStep = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    try {
      await api.updateFunnelStep(steps[index].id, { sort_order: newIndex });
      await api.updateFunnelStep(steps[newIndex].id, { sort_order: index });
      reload();
    } catch (err: any) { setError(err.message); }
  };

  const updateStepName = async (stepId: string, name: string) => {
    try { await api.updateFunnelStep(stepId, { name }); }
    catch (err: any) { setError(err.message); }
  };

  const updateStepCategory = async (stepId: string, category: string) => {
    try { await api.updateFunnelStep(stepId, { category }); reload(); }
    catch (err: any) { setError(err.message); }
  };

  const addVariant = async (stepId: string, videoId: string, videoTitle: string) => {
    try {
      await api.addStepVariant(stepId, { video_id: videoId, name: videoTitle, weight: 100 });
      setShowVideoPicker(null); reload();
    } catch (err: any) { setError(err.message); }
  };

  const deleteVariant = async (variantId: string) => {
    try { await api.deleteStepVariant(variantId); reload(); }
    catch (err: any) { setError(err.message); }
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!funnel) return <div className="text-center py-24 text-muted-foreground">Funnel not found</div>;

  const totalDuration = steps.reduce((sum, s) => {
    const mainVariant = s.variants?.[0];
    return sum + (mainVariant?.duration || 0);
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/funnels">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <input
              className="text-2xl font-bold bg-transparent border-none outline-none focus:border-b-2 focus:border-primary w-full"
              value={funnel.name}
              onChange={(e) => setFunnel({ ...funnel, name: e.target.value })}
              onBlur={() => handleSaveFunnel()}
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={funnel.status === "active" ? "success" : funnel.status === "paused" ? "warning" : "default"}>
                {funnel.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleSaveFunnel} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === LEFT: Steps === */}
        <div className="lg:col-span-2 space-y-2">
          {steps.map((step, index) => {
            const cat = categoryStyles[step.category] || categoryStyles.custom;
            return (
              <div key={step.id}>
                {/* Connector */}
                {index > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-4 bg-border" />
                      <span className="text-[10px] text-muted-foreground px-2">Auto-play</span>
                      <div className="w-px h-4 bg-border" />
                    </div>
                  </div>
                )}

                <Card className={`border-l-4 ${cat.border}`}>
                  {/* Step header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${cat.bg} ${cat.text}`}>{cat.label}</span>
                    <select
                      value={step.category}
                      onChange={(e) => updateStepCategory(step.id, e.target.value)}
                      className="h-7 rounded border border-border bg-background px-2 text-xs"
                    >
                      {Object.entries(categoryStyles).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input
                      className="flex-1 text-sm font-medium bg-transparent border-none outline-none"
                      value={step.name}
                      onChange={(e) => setSteps(steps.map((s) => s.id === step.id ? { ...s, name: e.target.value } : s))}
                      onBlur={(e) => updateStepName(step.id, e.target.value)}
                    />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStep(step.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Variants */}
                  <CardContent className="p-0">
                    {(step.variants || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                        No video assigned yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {step.variants.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-20 h-12 rounded bg-black flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {v.poster_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.poster_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Play className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{v.video_title || v.name}</div>
                              <div className="text-xs text-muted-foreground">{v.duration > 0 ? formatDuration(v.duration) : "—"}</div>
                            </div>
                            {v.is_winner ? <Badge variant="success"><Trophy className="w-3 h-3 mr-1" /> Winner</Badge> : null}
                            {step.variants.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteVariant(v.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setShowVideoPicker(step.id); loadVideos(); }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Video
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Add step */}
          {showAddStep ? (
            <Card className="border-dashed">
              <div className="flex items-center gap-3">
                <Input value={newStepName} onChange={(e) => setNewStepName(e.target.value)} placeholder="Step name" className="flex-1" autoFocus />
                <select value={newStepCategory} onChange={(e) => setNewStepCategory(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  {Object.entries(categoryStyles).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <Button size="sm" onClick={addStep}><Check className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddStep(false)}><X className="w-4 h-4" /></Button>
              </div>
            </Card>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setShowAddStep(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Step
            </Button>
          )}
        </div>

        {/* === RIGHT: Settings === */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardTitle className="mb-4">Settings</CardTitle>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="font-medium text-sm">Combined Progress Bar</div>
                  <div className="text-xs text-muted-foreground">Viewer sees progress across all steps, not per video</div>
                </div>
                <button
                  onClick={() => setFunnel({ ...funnel, combined_progress: !funnel.combined_progress })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${funnel.combined_progress ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${funnel.combined_progress ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Preload (seconds)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="1" max="15" value={funnel.preload_seconds || 5} onChange={(e) => setFunnel({ ...funnel, preload_seconds: parseInt(e.target.value) })} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-8">{funnel.preload_seconds || 5}s</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Next video starts loading before current one ends</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select value={funnel.status} onChange={(e) => setFunnel({ ...funnel, status: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardTitle className="mb-4">Summary</CardTitle>
            <CardContent className="p-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Steps</span><span className="font-medium">{steps.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Duration</span><span className="font-medium">{totalDuration > 0 ? formatDuration(totalDuration) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={funnel.status === "active" ? "success" : funnel.status === "paused" ? "warning" : "default"}>{funnel.status}</Badge></div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardTitle className="flex items-center gap-2 mb-4"><Code className="w-5 h-5" /> Embed Code</CardTitle>
            <CardContent className="p-0">
              <p className="text-xs text-muted-foreground mb-3">This code replaces a single video embed. It plays all steps in sequence.</p>
              {embedCode ? (
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">{embedCode}</pre>
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={copyEmbed}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Save the funnel to generate embed code.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Picker Modal */}
      {showVideoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Select a Video</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowVideoPicker(null)}><X className="w-4 h-4" /></Button>
            </div>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {!videosLoaded ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No ready videos found. Upload a video first.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {videos.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => addVariant(showVideoPicker, v.id, v.title)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-24 h-14 rounded bg-black flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {(v.poster_url || v.posterUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.poster_url || v.posterUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{v.title}</div>
                        <div className="text-xs text-muted-foreground">{v.duration > 0 ? formatDuration(v.duration) : "—"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
