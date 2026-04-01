"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, CreditCard, Globe, Save, Check, Loader2, AlertCircle, Copy } from "lucide-react";

export default function SettingsPage() {
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setApiEndpoint(window.location.origin);
  }, []);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(apiEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and configuration.</p>
      </div>

      {/* Plan */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" /> Billing
        </CardTitle>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">Free Plan</span>
                <Badge>Current</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Unlimited videos, unlimited plays</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed / API */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" /> Embed Configuration
        </CardTitle>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">API / Player Base URL</label>
              <div className="flex gap-2">
                <Input readOnly value={apiEndpoint} className="bg-muted font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyEndpoint}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use this URL in your embed code and player configuration.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Player Script URL</label>
              <div className="flex gap-2">
                <Input readOnly value={`${apiEndpoint}/sp/smartplayer.min.js`} className="bg-muted font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(`${apiEndpoint}/sp/smartplayer.min.js`);
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code Example */}
      <Card>
        <CardTitle className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" /> Embed Code Template
        </CardTitle>
        <CardContent>
          <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
{`<!-- Replace VIDEO_ID with your actual video ID -->
<div id="smartplayer-VIDEO_ID"
     data-api="${apiEndpoint}"></div>
<script src="${apiEndpoint}/sp/smartplayer.min.js"
        defer></script>`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Copy this template and replace VIDEO_ID with the ID from any video&apos;s detail page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
