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
