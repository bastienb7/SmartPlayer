"use client";

import { use, useEffect, useState, useRef } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, MousePointer, Loader2, AlertCircle, Save, Check } from "lucide-react";
import { api } from "@/lib/api-client";

type CTAPosition = "inside-bottom" | "inside-center" | "below";
type CTAShape = "rounded" | "pill" | "square";

interface CTAItem {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
  url: string;
  buttonColor: string;
  buttonTextColor: string;
  openInNewTab: boolean;
  position: CTAPosition;
  paddingBottom: number;
  fontSize: number;
  fontFamily: string;
  shape: CTAShape;
  paddingX: number;
  paddingY: number;
}

const defaultCTA: Omit<CTAItem, "id"> = {
  timestamp: 0,
  duration: 10,
  text: "Click Here",
  url: "https://",
  buttonColor: "#6366f1",
  buttonTextColor: "#ffffff",
  openInNewTab: true,
  position: "inside-bottom",
  paddingBottom: 16,
  fontSize: 16,
  fontFamily: "sans-serif",
  shape: "rounded",
  paddingX: 32,
  paddingY: 12,
};

const shapeClass: Record<CTAShape, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
  square: "rounded-none",
};

const fontOptions = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Georgia', serif", label: "Georgia" },
];

export default function CTAEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ctas, setCTAs] = useState<CTAItem[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.getPlayerConfig(id),
      api.getVideo(id).catch(() => null),
    ]).then(([player, videoData]) => {
      const ctaConfig = player.ctaConfig;
      if (Array.isArray(ctaConfig) && ctaConfig.length > 0) {
        setCTAs(ctaConfig.map((c: any, i: number) => ({
          ...defaultCTA,
          ...c,
          id: c.id || `cta-${i}`,
        })));
      }
      const v = videoData?.video || videoData;
      if (v) {
        setVideoUrl(v.hlsUrl || v.hls_url || "");
        setPosterUrl(v.posterUrl || v.poster_url || "");
      }
    })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addCTA = () => {
    setCTAs([...ctas, { ...defaultCTA, id: `cta-${Date.now()}` }]);
  };

  const updateCTA = (ctaId: string, key: string, value: any) => {
    setCTAs(ctas.map((c) => (c.id === ctaId ? { ...c, [key]: value } : c)));
  };

  const deleteCTA = (ctaId: string) => {
    setCTAs(ctas.filter((c) => c.id !== ctaId));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updatePlayerConfig(id, { ctaConfig: ctas });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">CTA Buttons</h1>
          <p className="text-muted-foreground">Configure call-to-action buttons that appear during the video.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addCTA}>
            <Plus className="w-4 h-4 mr-2" /> Add CTA
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {ctas.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <MousePointer className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No CTAs configured yet. Add one to get started.</p>
            <Button onClick={addCTA}>
              <Plus className="w-4 h-4 mr-2" /> Add CTA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {ctas.map((cta, index) => (
            <Card key={cta.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <span className="text-sm font-semibold">CTA #{index + 1}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteCTA(cta.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              {/* Live Preview with real video */}
              <div className="mb-6">
                <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                  Live Preview — {cta.position === "below" ? "Below video" : cta.position === "inside-center" ? "Center overlay" : "Bottom overlay"}
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  {/* Video with CTA overlay */}
                  <div className="relative w-full aspect-video bg-black">
                    {/* Real video poster or video element as background */}
                    {posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white/50 border-b-[10px] border-b-transparent ml-1.5" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (cta.timestamp / 60) * 100)}%` }} />
                    </div>

                    {/* CTA inside video */}
                    {cta.position !== "below" && (
                      <div
                        className={`absolute left-0 right-0 flex justify-center ${cta.position === "inside-center" ? "inset-0 items-center" : "items-end"}`}
                        style={cta.position === "inside-bottom" ? { bottom: `${cta.paddingBottom}px` } : undefined}
                      >
                        <button
                          className={`${shapeClass[cta.shape]} font-semibold shadow-xl transition-transform hover:scale-105`}
                          style={{
                            backgroundColor: cta.buttonColor,
                            color: cta.buttonTextColor,
                            fontSize: `${cta.fontSize}px`,
                            fontFamily: cta.fontFamily,
                            paddingLeft: `${cta.paddingX}px`,
                            paddingRight: `${cta.paddingX}px`,
                            paddingTop: `${cta.paddingY}px`,
                            paddingBottom: `${cta.paddingY}px`,
                          }}
                        >
                          {cta.text || "Click Here"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CTA below video */}
                  {cta.position === "below" && (
                    <div className="flex justify-center bg-muted/30 border-t border-border" style={{ padding: `${cta.paddingBottom}px 0` }}>
                      <button
                        className={`${shapeClass[cta.shape]} font-semibold shadow-lg`}
                        style={{
                          backgroundColor: cta.buttonColor,
                          color: cta.buttonTextColor,
                          fontSize: `${cta.fontSize}px`,
                          fontFamily: cta.fontFamily,
                          paddingLeft: `${cta.paddingX}px`,
                          paddingRight: `${cta.paddingX}px`,
                          paddingTop: `${cta.paddingY}px`,
                          paddingBottom: `${cta.paddingY}px`,
                        }}
                      >
                        {cta.text || "Click Here"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Appears at <span className="font-medium text-foreground">{cta.timestamp}s</span>{cta.duration === -1 ? <span> and <span className="font-medium text-foreground">stays forever</span></span> : <span> for <span className="font-medium text-foreground">{cta.duration}s</span></span>}
                </div>
              </div>

              {/* Settings */}
              <CardContent className="p-0">
                {/* Row 1: Text & URL */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Button Text</label>
                    <Input value={cta.text} onChange={(e) => updateCTA(cta.id, "text", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">URL</label>
                    <Input value={cta.url} onChange={(e) => updateCTA(cta.id, "url", e.target.value)} />
                  </div>
                </div>

                {/* Row 2: Timing */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Show at (seconds)</label>
                    <Input type="number" value={cta.timestamp} onChange={(e) => updateCTA(cta.id, "timestamp", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Duration</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={cta.duration === -1 ? "forever" : "timed"}
                        onChange={(e) => updateCTA(cta.id, "duration", e.target.value === "forever" ? -1 : 10)}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="timed">Timed</option>
                        <option value="forever">Stay forever</option>
                      </select>
                      {cta.duration !== -1 && (
                        <div className="flex items-center gap-1 flex-1">
                          <Input type="number" value={cta.duration} onChange={(e) => updateCTA(cta.id, "duration", parseInt(e.target.value) || 10)} />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">sec</span>
                        </div>
                      )}
                    </div>
                    {cta.duration === -1 && <p className="text-xs text-muted-foreground mt-1">CTA stays visible until the end of the video.</p>}
                  </div>
                </div>

                {/* Row 3: Position & Shape */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Position</label>
                    <select value={cta.position} onChange={(e) => updateCTA(cta.id, "position", e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="inside-bottom">In video — bottom</option>
                      <option value="inside-center">In video — center</option>
                      <option value="below">Below video</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Shape</label>
                    <select value={cta.shape} onChange={(e) => updateCTA(cta.id, "shape", e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="rounded">Rounded</option>
                      <option value="pill">Pill</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {cta.position === "below" ? "Vertical padding" : "Distance from bottom"}
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="80" value={cta.paddingBottom} onChange={(e) => updateCTA(cta.id, "paddingBottom", parseInt(e.target.value))} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{cta.paddingBottom}px</span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Colors */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Button Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={cta.buttonColor} onChange={(e) => updateCTA(cta.id, "buttonColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <Input value={cta.buttonColor} onChange={(e) => updateCTA(cta.id, "buttonColor", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Text Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={cta.buttonTextColor} onChange={(e) => updateCTA(cta.id, "buttonTextColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <Input value={cta.buttonTextColor} onChange={(e) => updateCTA(cta.id, "buttonTextColor", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Row 5: Typography & Size */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Font</label>
                    <select value={cta.fontFamily} onChange={(e) => updateCTA(cta.id, "fontFamily", e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      {fontOptions.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Font Size</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="12" max="32" value={cta.fontSize} onChange={(e) => updateCTA(cta.id, "fontSize", parseInt(e.target.value))} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{cta.fontSize}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Button Size</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="8" max="48" value={cta.paddingY} onChange={(e) => {
                        const py = parseInt(e.target.value);
                        updateCTA(cta.id, "paddingY", py);
                        updateCTA(cta.id, "paddingX", Math.round(py * 2.5));
                      }} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{cta.paddingY}px</span>
                    </div>
                  </div>
                </div>

                {/* Row 6: Open in new tab */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cta.openInNewTab} onChange={(e) => updateCTA(cta.id, "openInNewTab", e.target.checked)} className="rounded" id={`newTab-${cta.id}`} />
                  <label htmlFor={`newTab-${cta.id}`} className="text-sm">Open link in new tab</label>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full" variant="secondary" onClick={addCTA}>
            <Plus className="w-4 h-4 mr-2" /> Add Another CTA
          </Button>
        </div>
      )}
    </div>
  );
}
