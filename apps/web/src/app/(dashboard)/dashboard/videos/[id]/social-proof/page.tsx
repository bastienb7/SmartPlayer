"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

interface SocialProofItem {
  message: string;
  interval: number;
}

export default function SocialProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notifications, setNotifications] = useState<SocialProofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const sp = player.socialProofConfig;
        if (Array.isArray(sp) && sp.length > 0) {
          setNotifications(sp.map((item: any) => ({
            message: item.message || "",
            interval: item.interval ?? 30,
          })));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addNotification = () => {
    setNotifications([...notifications, { message: "", interval: 30 }]);
  };

  const updateNotification = (index: number, updates: Partial<SocialProofItem>) => {
    setNotifications(notifications.map((n, i) => (i === index ? { ...n, ...updates } : n)));
  };

  const removeNotification = (index: number) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const valid = notifications.filter((n) => n.message.trim());
      await api.updatePlayerConfig(id, { socialProofConfig: valid });
      setNotifications(valid);
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
            <Users className="w-6 h-6 text-primary" /> Social Proof
          </h1>
          <p className="text-muted-foreground">
            Show real-time notification popups to build trust and create FOMO.
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

      {/* Add notification button */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={addNotification}>
          <Plus className="w-4 h-4 mr-1" /> Add Notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <Users className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No social proof notifications configured yet.</p>
            <Button variant="outline" onClick={addNotification}>
              <Plus className="w-4 h-4 mr-1" /> Add First Notification
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <Card key={index}>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">Notification {index + 1}</Badge>
                <Button variant="ghost" size="icon" onClick={() => removeNotification(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message</label>
                    <Input
                      value={notification.message}
                      onChange={(e) => updateNotification(index, { message: e.target.value })}
                      placeholder='e.g., "John from Paris just purchased this course"'
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The notification text shown to viewers.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Interval (seconds)</label>
                    <Input
                      type="number"
                      min={5}
                      value={notification.interval}
                      onChange={(e) => updateNotification(index, { interval: parseInt(e.target.value) || 30 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Seconds between each time this notification is shown.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Notifications cycle through in order. Empty messages are removed on save.
          </p>
        </div>
      )}
    </div>
  );
}
