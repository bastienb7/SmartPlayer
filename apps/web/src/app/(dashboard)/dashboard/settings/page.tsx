"use client";

import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, CreditCard, Users } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization.</p>
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
              <p className="text-sm text-muted-foreground">1 video, 1,000 plays/month</p>
            </div>
            <Button variant="primary">Upgrade</Button>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Plays this month</span>
              <span className="font-medium">0 / 1,000</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "0%" }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" /> Organization
        </CardTitle>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Organization Name</label>
              <Input defaultValue="My Organization" />
            </div>
            <Button variant="secondary">Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardTitle className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" /> API
        </CardTitle>
        <CardContent>
          <div>
            <label className="text-sm font-medium mb-1.5 block">API Endpoint</label>
            <Input readOnly value="https://api.smartplayer.io" className="bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use this endpoint in your player embed code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
