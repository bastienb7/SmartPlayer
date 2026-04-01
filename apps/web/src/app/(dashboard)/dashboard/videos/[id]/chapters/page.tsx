"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ListOrdered, Plus, Trash2, Save, Loader2, Check, AlertCircle, GripVertical } from "lucide-react";
import { api } from "@/lib/api-client";

interface Chapter {
  title: string;
  timestamp: number;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const c = player.chaptersConfig;
        if (Array.isArray(c) && c.length > 0) {
          setChapters(c.map((ch: any) => ({
            title: ch.title || "",
            timestamp: ch.timestamp ?? 0,
          })));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addChapter = () => {
    setChapters([...chapters, { title: "", timestamp: 0 }]);
  };

  const updateChapter = (index: number, updates: Partial<Chapter>) => {
    setChapters(chapters.map((ch, i) => (i === index ? { ...ch, ...updates } : ch)));
  };

  const removeChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const validChapters = chapters.filter((ch) => ch.title.trim());
      const sorted = [...validChapters].sort((a, b) => a.timestamp - b.timestamp);
      await api.updatePlayerConfig(id, { chaptersConfig: sorted });
      setChapters(sorted);
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
            <ListOrdered className="w-6 h-6 text-primary" /> Chapters
          </h1>
          <p className="text-muted-foreground">
            Define chapters so viewers can navigate to key moments in your video.
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

      {/* Add chapter button */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={addChapter}>
          <Plus className="w-4 h-4 mr-1" /> Add Chapter
        </Button>
      </div>

      {chapters.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <ListOrdered className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No chapters configured yet.</p>
            <Button variant="outline" onClick={addChapter}>
              <Plus className="w-4 h-4 mr-1" /> Add First Chapter
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <Card key={index}>
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {formatTimestamp(chapter.timestamp)}
                </Badge>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={chapter.title}
                    onChange={(e) => updateChapter(index, { title: e.target.value })}
                    placeholder="Chapter title"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={chapter.timestamp}
                    onChange={(e) => updateChapter(index, { timestamp: parseInt(e.target.value) || 0 })}
                    placeholder="Seconds"
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeChapter(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Chapters are automatically sorted by timestamp when saved. Empty titles are removed.
          </p>
        </div>
      )}
    </div>
  );
}
