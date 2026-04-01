"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Trash2, Loader2, AlertCircle, Save, Check, Info, Zap, BarChart3, Eye } from "lucide-react";
import { api } from "@/lib/api-client";

type Platform = "facebook" | "google" | "tiktok";

interface PixelItem {
  id: string;
  platform: Platform;
  pixelId: string;
  fireDelay: number;
  events: Array<{ eventName: string; triggerTimestamp: number }>;
}

const platformInfo: Record<Platform, {
  label: string;
  color: string;
  icon: string;
  description: string;
  idLabel: string;
  idPlaceholder: string;
  idHelp: string;
  autoEvents: string[];
  suggestedEvents: string[];
}> = {
  facebook: {
    label: "Meta Pixel (Facebook)",
    color: "info",
    icon: "f",
    description: "Track conversions, build audiences for retargeting, and optimize ad delivery based on video engagement.",
    idLabel: "Pixel ID",
    idPlaceholder: "123456789012345",
    idHelp: "Find your Pixel ID in Meta Events Manager > Data Sources > Your Pixel.",
    autoEvents: ["PageView (on embed load)", "ViewContent (on play start)"],
    suggestedEvents: ["Lead", "Purchase", "CompleteRegistration", "AddToCart", "InitiateCheckout", "Subscribe"],
  },
  google: {
    label: "Google Analytics (GA4)",
    color: "warning",
    icon: "G",
    description: "Send video engagement events to Google Analytics 4 for attribution, audience building, and conversion tracking.",
    idLabel: "Measurement ID",
    idPlaceholder: "G-XXXXXXXXXX",
    idHelp: "Find your Measurement ID in GA4 > Admin > Data Streams > Your Stream.",
    autoEvents: ["page_view (on embed load)", "video_start (on play)"],
    suggestedEvents: ["generate_lead", "purchase", "sign_up", "begin_checkout", "add_to_cart"],
  },
  tiktok: {
    label: "TikTok Pixel",
    color: "default",
    icon: "T",
    description: "Track video-driven conversions to optimize TikTok ad campaigns and build custom audiences from engaged viewers.",
    idLabel: "Pixel ID",
    idPlaceholder: "CXXXXXXXXXXXXXXXXX",
    idHelp: "Find your Pixel ID in TikTok Ads Manager > Assets > Events > Web Events.",
    autoEvents: ["Pageview (on embed load)", "ViewContent (on play start)"],
    suggestedEvents: ["CompletePayment", "SubmitForm", "Subscribe", "AddToCart", "PlaceAnOrder", "Registration"],
  },
};

export default function PixelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pixels, setPixels] = useState<PixelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const pixelConfig = player.pixelConfig;
        if (Array.isArray(pixelConfig) && pixelConfig.length > 0) {
          setPixels(pixelConfig.map((p: any, i: number) => ({
            id: p.id || `px-${i}`,
            platform: p.platform || "facebook",
            pixelId: p.pixelId || "",
            fireDelay: p.fireDelay ?? 0,
            events: p.events || [],
          })));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addPixel = (platform: Platform) => {
    setPixels([...pixels, { id: `px-${Date.now()}`, platform, pixelId: "", fireDelay: 0, events: [] }]);
  };

  const updatePixel = (pixelId: string, updates: Partial<PixelItem>) => {
    setPixels(pixels.map((p) => (p.id === pixelId ? { ...p, ...updates } : p)));
  };

  const deletePixel = (pixelId: string) => {
    setPixels(pixels.filter((p) => p.id !== pixelId));
  };

  const addEvent = (pixelId: string, eventName = "Purchase") => {
    setPixels(pixels.map((p) => {
      if (p.id !== pixelId) return p;
      return { ...p, events: [...p.events, { eventName, triggerTimestamp: 0 }] };
    }));
  };

  const updateEvent = (pixelId: string, eventIndex: number, updates: Partial<{ eventName: string; triggerTimestamp: number }>) => {
    setPixels(pixels.map((p) => {
      if (p.id !== pixelId) return p;
      const events = [...p.events];
      events[eventIndex] = { ...events[eventIndex], ...updates };
      return { ...p, events };
    }));
  };

  const removeEvent = (pixelId: string, eventIndex: number) => {
    setPixels(pixels.map((p) => {
      if (p.id !== pixelId) return p;
      return { ...p, events: p.events.filter((_, i) => i !== eventIndex) };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const validPixels = pixels.filter((p) => p.pixelId.trim());
      await api.updatePlayerConfig(id, { pixelConfig: validPixels });
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

  const existingPlatforms = new Set(pixels.map((p) => p.platform));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Tracking Pixels
          </h1>
          <p className="text-muted-foreground">
            Connect your ad platforms to track conversions from video engagement.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* How it works */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardTitle className="flex items-center gap-2 mb-3 text-base">
          <Info className="w-5 h-5 text-primary" /> How Tracking Pixels Work
        </CardTitle>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex gap-2">
              <Eye className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-0.5">Automatic tracking</div>
                <div className="text-xs text-muted-foreground">Page views and video starts are tracked automatically when a viewer loads your video.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-0.5">Timed events</div>
                <div className="text-xs text-muted-foreground">Fire conversion events (Purchase, Lead, etc.) at specific timestamps in your video.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <BarChart3 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-0.5">Retargeting</div>
                <div className="text-xs text-muted-foreground">Build audiences of engaged viewers for retargeting in your ad platforms.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add pixel buttons */}
      <div className="flex gap-2 mb-6">
        {(["facebook", "google", "tiktok"] as Platform[]).map((platform) => {
          const info = platformInfo[platform];
          return (
            <Button
              key={platform}
              variant="outline"
              size="sm"
              onClick={() => addPixel(platform)}
              disabled={existingPlatforms.has(platform)}
            >
              <Plus className="w-4 h-4 mr-1" /> {info.label}
            </Button>
          );
        })}
      </div>

      {pixels.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <Shield className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium mb-1">No tracking pixels configured</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Add a pixel to start tracking video-driven conversions in Facebook, Google Analytics, or TikTok.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {pixels.map((pixel) => {
            const info = platformInfo[pixel.platform];
            return (
              <Card key={pixel.id}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{info.label}</span>
                        {pixel.pixelId && <Badge variant="success">Active</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{info.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePixel(pixel.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <CardContent className="p-0 mt-4">
                  {/* Pixel ID */}
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1.5 block">{info.idLabel}</label>
                    <Input
                      value={pixel.pixelId}
                      onChange={(e) => updatePixel(pixel.id, { pixelId: e.target.value })}
                      placeholder={info.idPlaceholder}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {info.idHelp}
                    </p>
                  </div>

                  {/* Fire delay */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <label className="text-sm font-medium block">Fire Delay</label>
                        <p className="text-xs text-muted-foreground">Wait before activating the pixel — filters out casual visitors and only tracks engaged viewers.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <select
                        value={pixel.fireDelay === 0 ? "instant" : "delayed"}
                        onChange={(e) => updatePixel(pixel.id, { fireDelay: e.target.value === "instant" ? 0 : 5 })}
                        className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="instant">Fire instantly</option>
                        <option value="delayed">Delay before firing</option>
                      </select>
                      {pixel.fireDelay > 0 && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="range"
                            min="1"
                            max="60"
                            value={pixel.fireDelay}
                            onChange={(e) => updatePixel(pixel.id, { fireDelay: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-10 text-right">{pixel.fireDelay}s</span>
                        </div>
                      )}
                    </div>
                    {pixel.fireDelay > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
                        The pixel will only load after the viewer has been on the page for {pixel.fireDelay} seconds. Visitors who leave before {pixel.fireDelay}s won&apos;t be tracked or added to your audiences — keeping your data clean and your retargeting focused on qualified viewers.
                      </p>
                    )}
                  </div>

                  {/* Auto events info */}
                  <div className="bg-muted/50 rounded-lg p-3 mb-4">
                    <div className="text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wide">
                      Automatic events {pixel.fireDelay > 0 ? `(fired after ${pixel.fireDelay}s delay)` : "(always fired)"}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {info.autoEvents.map((evt) => (
                        <span key={evt} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Custom events */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium block">Custom Conversion Events</label>
                        <p className="text-xs text-muted-foreground">Fire specific events at timestamps in the video (e.g., fire &quot;Purchase&quot; when the CTA appears)</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addEvent(pixel.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Event
                      </Button>
                    </div>

                    {pixel.events.length === 0 ? (
                      <div className="border border-dashed border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-3">No custom events yet. Quick add a common event:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {info.suggestedEvents.map((evt) => (
                            <button
                              key={evt}
                              onClick={() => addEvent(pixel.id, evt)}
                              className="text-xs bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-full transition-colors border border-border hover:border-primary/30"
                            >
                              + {evt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pixel.events.map((evt, i) => (
                          <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Event name</label>
                              <Input
                                value={evt.eventName}
                                onChange={(e) => updateEvent(pixel.id, i, { eventName: e.target.value })}
                                placeholder="Event name"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fire at (sec)</label>
                              <Input
                                type="number"
                                value={evt.triggerTimestamp}
                                onChange={(e) => updateEvent(pixel.id, i, { triggerTimestamp: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="pt-3.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEvent(pixel.id, i)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {/* Quick add suggestions */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-muted-foreground">Quick add:</span>
                          <div className="flex flex-wrap gap-1">
                            {info.suggestedEvents
                              .filter((s) => !pixel.events.some((e) => e.eventName === s))
                              .slice(0, 4)
                              .map((evt) => (
                                <button
                                  key={evt}
                                  onClick={() => addEvent(pixel.id, evt)}
                                  className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded-full transition-colors"
                                >
                                  + {evt}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
