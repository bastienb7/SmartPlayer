"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, MousePointer, Loader2, AlertCircle, Save, Check } from "lucide-react";
import { api } from "@/lib/api-client";

interface CTAItem {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
  url: string;
  buttonColor: string;
  buttonTextColor: string;
  openInNewTab: boolean;
}

export default function CTAEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ctas, setCTAs] = useState<CTAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const ctaConfig = player.ctaConfig;
        if (Array.isArray(ctaConfig) && ctaConfig.length > 0) {
          setCTAs(ctaConfig.map((c: any, i: number) => ({
            id: c.id || `cta-${i}`,
            timestamp: c.timestamp ?? 0,
            duration: c.duration ?? 10,
            text: c.text || "Click Here",
            url: c.url || "https://",
            buttonColor: c.buttonColor || "#6366f1",
            buttonTextColor: c.buttonTextColor || "#ffffff",
            openInNewTab: c.openInNewTab ?? true,
          })));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addCTA = () => {
    setCTAs([...ctas, {
      id: `cta-${Date.now()}`,
      timestamp: 0,
      duration: 10,
      text: "Click Here",
      url: "https://",
      buttonColor: "#6366f1",
      buttonTextColor: "#ffffff",
      openInNewTab: true,
    }]);
  };

  const updateCTA = (ctaId: string, key: keyof CTAItem, value: any) => {
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
    <div className="max-w-3xl">
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
        <div className="space-y-4">
          {ctas.map((cta, index) => (
            <Card key={cta.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="pt-1 text-muted-foreground cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>
                <CardContent className="flex-1 p-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">CTA #{index + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteCTA(cta.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {/* Live Preview */}
                  <div className="bg-muted rounded-lg p-6 mb-4 flex flex-col items-center gap-2">
                    <div className="text-xs text-muted-foreground mb-1">Preview</div>
                    <div className="relative w-full max-w-md aspect-video bg-black rounded-lg flex items-end justify-center pb-6">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                      <button
                        className="relative z-10 px-8 py-3 rounded-lg font-semibold text-sm shadow-lg transition-transform hover:scale-105"
                        style={{
                          backgroundColor: cta.buttonColor,
                          color: cta.buttonTextColor,
                        }}
                      >
                        {cta.text || "Click Here"}
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Appears at {cta.timestamp}s for {cta.duration}s
                      {cta.url && cta.url !== "https://" && <span> &rarr; {cta.url}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Button Text</label>
                      <Input value={cta.text} onChange={(e) => updateCTA(cta.id, "text", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">URL</label>
                      <Input value={cta.url} onChange={(e) => updateCTA(cta.id, "url", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Show at (seconds)</label>
                      <Input type="number" value={cta.timestamp} onChange={(e) => updateCTA(cta.id, "timestamp", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Duration (seconds)</label>
                      <Input type="number" value={cta.duration} onChange={(e) => updateCTA(cta.id, "duration", parseInt(e.target.value) || 10)} />
                    </div>
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
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={cta.openInNewTab} onChange={(e) => updateCTA(cta.id, "openInNewTab", e.target.checked)} className="rounded" />
                        Open in new tab
                      </label>
                    </div>
                  </div>
                </CardContent>
              </div>
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
