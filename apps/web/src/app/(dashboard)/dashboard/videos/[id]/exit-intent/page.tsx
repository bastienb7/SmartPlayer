"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Save, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

function FeatureToggle({ label, description, enabled, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function ExitIntentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [playerId, setPlayerId] = useState("");
  const [exitIntentId, setExitIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [config, setConfig] = useState({
    message: "Wait! You're about to miss something important...",
    subMessage: "Keep watching to discover the secret.",
    buttonText: "Continue Watching",
    imageUrl: "",
    backgroundColor: "#1a1a2e",
    textColor: "#ffffff",
    buttonColor: "#6366f1",
    triggerOnMouseLeave: true,
    triggerOnTabSwitch: true,
    triggerOnBackButton: false,
    triggerOnIdle: false,
    idleTimeoutSeconds: 30,
    maxShowsPerSession: 1,
    minWatchSeconds: 30,
    pitchTimestamp: 0,
    contextMessages: {
      beforePitch: "",
      duringPitch: "",
      afterPitch: "",
    },
  });

  const update = (key: string, value: any) => setConfig((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        setPlayerId(player.id);
        return api.getExitIntent(player.id);
      })
      .then((data) => {
        if (data.exitIntent) {
          setExitIntentId(data.exitIntent.id);
          setConfig({
            message: data.exitIntent.message || config.message,
            subMessage: data.exitIntent.subMessage || "",
            buttonText: data.exitIntent.buttonText || config.buttonText,
            imageUrl: data.exitIntent.imageUrl || "",
            backgroundColor: data.exitIntent.backgroundColor || "#1a1a2e",
            textColor: data.exitIntent.textColor || "#ffffff",
            buttonColor: data.exitIntent.buttonColor || "#6366f1",
            triggerOnMouseLeave: data.exitIntent.triggerOnMouseLeave ?? true,
            triggerOnTabSwitch: data.exitIntent.triggerOnTabSwitch ?? true,
            triggerOnBackButton: data.exitIntent.triggerOnBackButton ?? false,
            triggerOnIdle: data.exitIntent.triggerOnIdle ?? false,
            idleTimeoutSeconds: data.exitIntent.idleTimeoutSeconds ?? 30,
            maxShowsPerSession: data.exitIntent.maxShowsPerSession ?? 1,
            minWatchSeconds: data.exitIntent.minWatchSeconds ?? 30,
            pitchTimestamp: data.exitIntent.pitchTimestamp ?? 0,
            contextMessages: data.exitIntent.contextMessages || { beforePitch: "", duringPitch: "", afterPitch: "" },
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!playerId) return;
    setSaving(true);
    setError("");
    try {
      const result = await api.saveExitIntent({ playerId, ...config });
      setExitIntentId(result.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!exitIntentId) return;
    try {
      await api.deleteExitIntent(exitIntentId);
      setExitIntentId(null);
      setConfig({
        message: "Wait! You're about to miss something important...",
        subMessage: "",
        buttonText: "Continue Watching",
        imageUrl: "",
        backgroundColor: "#1a1a2e",
        textColor: "#ffffff",
        buttonColor: "#6366f1",
        triggerOnMouseLeave: true,
        triggerOnTabSwitch: true,
        triggerOnBackButton: false,
        triggerOnIdle: false,
        idleTimeoutSeconds: 30,
        maxShowsPerSession: 1,
        minWatchSeconds: 30,
        pitchTimestamp: 0,
        contextMessages: { beforePitch: "", duringPitch: "", afterPitch: "" },
      });
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Exit-Intent Popup
          </h1>
          <p className="text-muted-foreground">
            Show a popup when viewers try to leave, encouraging them to keep watching.
          </p>
        </div>
        <div className="flex gap-2">
          {exitIntentId && (
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </Button>
          )}
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

      {/* Content */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Popup Content</CardTitle>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Main Message</label>
              <Input value={config.message} onChange={(e) => update("message", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sub-Message (optional)</label>
              <Input value={config.subMessage} onChange={(e) => update("subMessage", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Button Text</label>
                <Input value={config.buttonText} onChange={(e) => update("buttonText", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Image URL (optional)</label>
                <Input value={config.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Style */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Style</CardTitle>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Background Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.backgroundColor} onChange={(e) => update("backgroundColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={config.backgroundColor} onChange={(e) => update("backgroundColor", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Text Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.textColor} onChange={(e) => update("textColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={config.textColor} onChange={(e) => update("textColor", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Button Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.buttonColor} onChange={(e) => update("buttonColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={config.buttonColor} onChange={(e) => update("buttonColor", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 rounded-lg p-8 text-center" style={{ backgroundColor: config.backgroundColor }}>
            <p className="text-lg font-bold mb-2" style={{ color: config.textColor }}>{config.message}</p>
            {config.subMessage && <p className="text-sm mb-4" style={{ color: config.textColor, opacity: 0.8 }}>{config.subMessage}</p>}
            <button className="px-6 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: config.buttonColor }}>
              {config.buttonText}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Triggers</CardTitle>
        <CardContent>
          <FeatureToggle label="Mouse Leave" description="Show popup when cursor moves outside the page" enabled={config.triggerOnMouseLeave} onToggle={(v) => update("triggerOnMouseLeave", v)} />
          <FeatureToggle label="Tab Switch" description="Show popup when viewer switches to another tab" enabled={config.triggerOnTabSwitch} onToggle={(v) => update("triggerOnTabSwitch", v)} />
          <FeatureToggle label="Back Button" description="Show popup when viewer presses browser back button" enabled={config.triggerOnBackButton} onToggle={(v) => update("triggerOnBackButton", v)} />
          <FeatureToggle label="Idle Detection" description="Show popup when viewer is idle for a specified time" enabled={config.triggerOnIdle} onToggle={(v) => update("triggerOnIdle", v)} />
          {config.triggerOnIdle && (
            <div className="mt-3">
              <label className="text-sm font-medium mb-1.5 block">Idle Timeout (seconds)</label>
              <Input type="number" value={config.idleTimeoutSeconds} onChange={(e) => update("idleTimeoutSeconds", parseInt(e.target.value) || 30)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardTitle className="mb-4">Display Rules</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Max Shows Per Session</label>
              <Input type="number" min={1} max={5} value={config.maxShowsPerSession} onChange={(e) => update("maxShowsPerSession", parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Min Watch Time (seconds)</label>
              <Input type="number" min={0} value={config.minWatchSeconds} onChange={(e) => update("minWatchSeconds", parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">Viewer must watch at least this long before popup can show</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
