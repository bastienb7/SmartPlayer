"use client";

import { use, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, MousePointer } from "lucide-react";

interface CTAItem {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
  url: string;
  buttonColor: string;
}

export default function CTAEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ctas, setCTAs] = useState<CTAItem[]>([
    { id: "1", timestamp: 10, duration: 8, text: "Get Started Now!", url: "https://example.com", buttonColor: "#6366f1" },
    { id: "2", timestamp: 30, duration: 10, text: "Limited Time Offer", url: "https://example.com/offer", buttonColor: "#ef4444" },
  ]);

  const addCTA = () => {
    setCTAs([
      ...ctas,
      {
        id: Date.now().toString(),
        timestamp: 0,
        duration: 10,
        text: "Click Here",
        url: "https://",
        buttonColor: "#6366f1",
      },
    ]);
  };

  const updateCTA = (ctaId: string, key: keyof CTAItem, value: any) => {
    setCTAs(ctas.map((c) => (c.id === ctaId ? { ...c, [key]: value } : c)));
  };

  const deleteCTA = (ctaId: string) => {
    setCTAs(ctas.filter((c) => c.id !== ctaId));
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">CTA Buttons</h1>
          <p className="text-muted-foreground">Configure call-to-action buttons that appear during the video.</p>
        </div>
        <Button onClick={addCTA}>
          <Plus className="w-4 h-4 mr-2" /> Add CTA
        </Button>
      </div>

      {ctas.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <MousePointer className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No CTAs configured yet. Add one to get started.</p>
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
                    <span className="text-sm font-medium text-muted-foreground">
                      CTA #{index + 1}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => deleteCTA(cta.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Button Text</label>
                      <Input
                        value={cta.text}
                        onChange={(e) => updateCTA(cta.id, "text", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">URL</label>
                      <Input
                        value={cta.url}
                        onChange={(e) => updateCTA(cta.id, "url", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Show at (seconds)</label>
                      <Input
                        type="number"
                        value={cta.timestamp}
                        onChange={(e) => updateCTA(cta.id, "timestamp", parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Duration (seconds)</label>
                      <Input
                        type="number"
                        value={cta.duration}
                        onChange={(e) => updateCTA(cta.id, "duration", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Button Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={cta.buttonColor}
                          onChange={(e) => updateCTA(cta.id, "buttonColor", e.target.value)}
                          className="w-10 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={cta.buttonColor}
                          onChange={(e) => updateCTA(cta.id, "buttonColor", e.target.value)}
                        />
                      </div>
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
