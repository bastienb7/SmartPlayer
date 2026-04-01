"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Trash2, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

interface PageSyncRule {
  selector: string;
  action: string;
  triggerAtPercent: number;
}

const actionOptions = [
  { value: "show", label: "Show", description: "Make the element visible" },
  { value: "hide", label: "Hide", description: "Hide the element" },
  { value: "scroll-to", label: "Scroll To", description: "Scroll the page to the element" },
  { value: "add-class", label: "Add Class", description: "Add a CSS class to the element" },
];

export default function PageSyncPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rules, setRules] = useState<PageSyncRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const ps = player.pageSyncConfig;
        if (Array.isArray(ps) && ps.length > 0) {
          setRules(ps.map((rule: any) => ({
            selector: rule.selector || "",
            action: rule.action || "show",
            triggerAtPercent: rule.triggerAtPercent ?? 50,
          })));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addRule = () => {
    setRules([...rules, { selector: "", action: "show", triggerAtPercent: 50 }]);
  };

  const updateRule = (index: number, updates: Partial<PageSyncRule>) => {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const valid = rules.filter((r) => r.selector.trim());
      await api.updatePlayerConfig(id, { pageSyncConfig: valid });
      setRules(valid);
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Page Sync
          </h1>
          <p className="text-muted-foreground">
            Trigger actions on page elements based on video playback progress.
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

      {/* Preview */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Preview</CardTitle>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Left: video player */}
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden">
              {/* Fake progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full w-[50%] bg-primary" />
              </div>
              {/* Play icon hint */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white/60 ml-0.5" />
                </div>
              </div>
              <span className="absolute top-2 left-2 text-[9px] text-white/40 font-medium">VIDEO</span>
            </div>
            {/* Right: webpage mock */}
            <div className="relative bg-muted rounded-lg aspect-video overflow-hidden p-3 flex flex-col gap-2">
              <span className="text-[9px] text-muted-foreground font-medium">WEBPAGE</span>
              {/* Placeholder webpage elements */}
              <div className="h-2 w-3/4 bg-foreground/10 rounded" />
              <div className="h-2 w-full bg-foreground/10 rounded" />
              <div className="h-2 w-5/6 bg-foreground/10 rounded" />
              {/* Highlight synced rules */}
              {rules.length > 0 ? (
                <div className="mt-auto space-y-1.5">
                  {rules.slice(0, 4).map((rule, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono ${
                        rule.action === "show"
                          ? "bg-green-500/15 text-green-600 border border-green-500/30"
                          : rule.action === "hide"
                          ? "bg-red-500/15 text-red-600 border border-red-500/30 opacity-50"
                          : rule.action === "scroll-to"
                          ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                          : "bg-yellow-500/15 text-yellow-600 border border-yellow-500/30"
                      }`}
                    >
                      <span className="truncate">{rule.selector || ".element"}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                        {rule.action}
                      </Badge>
                      <span className="text-[8px] shrink-0 opacity-60">@{rule.triggerAtPercent}%</span>
                    </div>
                  ))}
                  {rules.length > 4 && (
                    <p className="text-[9px] text-muted-foreground">+{rules.length - 4} more</p>
                  )}
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="px-2 py-1 rounded text-[9px] text-muted-foreground border border-dashed border-muted-foreground/30">
                    Add rules to see sync preview
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add rule button */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <Layers className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No page sync rules configured yet.</p>
            <Button variant="outline" onClick={addRule}>
              <Plus className="w-4 h-4 mr-1" /> Add First Rule
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <Card key={index}>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">Rule {index + 1}</Badge>
                <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">CSS Selector</label>
                    <Input
                      value={rule.selector}
                      onChange={(e) => updateRule(index, { selector: e.target.value })}
                      placeholder='e.g., "#cta-section", ".bonus-content"'
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Action</label>
                      <select
                        value={rule.action}
                        onChange={(e) => updateRule(index, { action: e.target.value })}
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {actionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Trigger At (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.triggerAtPercent}
                        onChange={(e) => updateRule(index, { triggerAtPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Percentage of video watched before triggering.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Rules with empty selectors are removed on save. Use valid CSS selectors that match elements on your page.
          </p>
        </div>
      )}
    </div>
  );
}
