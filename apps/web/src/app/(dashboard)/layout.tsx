"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useAuth } from "@/lib/auth";
import { Loader2, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerificationBanner() {
  const { user, resendVerification } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    await resendVerification();
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-amber-400">
        <Mail className="w-4 h-4" />
        <span>Please verify your email <strong>{user.email}</strong> — check your inbox.</span>
      </div>
      <Button variant="outline" size="sm" onClick={handleResend} disabled={sending || sent} className="text-xs">
        {sent ? <><Check className="w-3 h-3 mr-1" /> Sent!</> : sending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending...</> : "Resend email"}
      </Button>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <VerificationBanner />
        <main className="flex-1">
          <div className="p-8 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
