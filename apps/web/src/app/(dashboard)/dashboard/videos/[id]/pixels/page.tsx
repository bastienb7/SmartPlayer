"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Trash2, Loader2, AlertCircle, Save, Check } from "lucide-react";
import { api } from "@/lib/api-client";

type Platform = "facebook" | "google" | "tiktok";

interface PixelItem {
  id: string;
  platform: Platform;
  pixelId: string;
  events: Array<{ eventName: string; triggerTimestamp: number }>;
  _isNew?: boolean;
}

const platformLabels: Record<Platform, string> = {
  facebook: "Facebook Pixel",
  google: "Google Analytics",
  tiktok: "TikTok Pixel",
};

const platformColors: Record<Platform, string> = {
  facebook: "info",
  google: "warning",
  tiktok: "default",
};

export default function PixelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [playerId, setPlayerId] = useState("");
  const [pixels, setPixels] = useState<PixelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        setPlayerId(player.id);
        return api.getPixels(player.id);
      })
      .then((data) => {
        setPixels(data.pixels.map((p: any) => ({
          id: p.id,
          platform: p.platform,
          pixelId: p.pixelId,
          events: p.events || [],
        })));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addPixel = (platform: Platform) => {
    setPixels([...pixels, {
      id: `new-${Date.now()}`,
      platform,
      pixelId: "",
      events: [],
      _isNew: true,
    }]);
  };

  const updatePixel = (pixelId: string, updates: Partial<PixelItem>) => {
    setPixels(pixels.map((p) => (p.id === pixelId ? { ...p, ...updates } : p)));
  };

  const deletePixelItem = async (pixelId: string) => {
    const pixel = pixels.find((p) => p.id === pixelId);
    if (pixel && !pixel._isNew) {
      try {
        await api.deletePixel(pixelId);
      } catch (err: any) {
        setError(err.message);
        return;
      }
    }
    setPixels(pixels.filter((p) => p.id !== pixelId));
  };

  const addEvent = (pixelId: string) => {
    setPixels(pixels.map((p) => {
      if (p.id !== pixelId) return p;
      return { ...p, events: [...p.events, { eventName: "Purchase", triggerTimestamp: 0 }] };
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
    if (!playerId) return;
    setSaving(true);
    setError("");

    try {
      const updated: PixelItem[] = [];
      for (const pixel of pixels) {
        if (!pixel.pixelId.trim()) continue;

        if (pixel._isNew) {
          const created = await api.createPixel({
            playerId,
            platform: pixel.platform,
            pixelId: pixel.pixelId,
            events: pixel.events,
          });
          updated.push({ ...pixel, id: created.id, _isNew: false });
        } else {
          await api.updatePixel(pixel.id, {
            pixelId: pixel.pixelId,
            events: pixel.events,
          });
          updated.push({ ...pixel, _isNew: false });
        }
      }
      setPixels(updated);
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
            Add Facebook, Google, or TikTok pixels to fire conversion events during video playback.
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

      {/* Add pixel buttons */}
      <div className="flex gap-2 mb-6">
        {(["facebook", "google", "tiktok"] as Platform[]).map((platform) => (
          <Button
            key={platform}
            variant="outline"
            size="sm"
            onClick={() => addPixel(platform)}
            disabled={existingPlatforms.has(platform)}
          >
            <Plus className="w-4 h-4 mr-1" /> {platformLabels[platform]}
          </Button>
        ))}
      </div>

      {pixels.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <Shield className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No tracking pixels configured yet.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pixels.map((pixel) => (
            <Card key={pixel.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={platformColors[pixel.platform] as any}>
                    {platformLabels[pixel.platform]}
                  </Badge>
                  {pixel._isNew && <span className="text-xs text-primary">(new)</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePixelItem(pixel.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <CardContent className="p-0">
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1.5 block">
                    {pixel.platform === "google" ? "Measurement ID" : "Pixel ID"}
                  </label>
                  <Input
                    value={pixel.pixelId}
                    onChange={(e) => updatePixel(pixel.id, { pixelId: e.target.value })}
                    placeholder={pixel.platform === "google" ? "G-XXXXXXXXXX" : pixel.platform === "facebook" ? "123456789012345" : "XXXXXXXXXXXXXXX"}
                  />
                </div>

                {/* Custom events */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Custom Events</label>
                    <Button variant="outline" size="sm" onClick={() => addEvent(pixel.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Event
                    </Button>
                  </div>
                  {pixel.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No custom events. Standard events (PageView, ViewContent) fire automatically.</p>
                  ) : (
                    <div className="space-y-2">
                      {pixel.events.map((evt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={evt.eventName}
                            onChange={(e) => updateEvent(pixel.id, i, { eventName: e.target.value })}
                            placeholder="Event name (e.g., Purchase)"
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={evt.triggerTimestamp}
                            onChange={(e) => updateEvent(pixel.id, i, { triggerTimestamp: parseFloat(e.target.value) || 0 })}
                            placeholder="At (sec)"
                            className="w-24"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeEvent(pixel.id, i)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
