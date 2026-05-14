"use client";

import api from "@/lib/api";
import { signOut } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useLogStore } from "@/store/logStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

function DangerZone() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearLog = useLogStore((s) => s.clearLog);
  const clearChat = useChatStore((s) => s.clearChat);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete("/auth/me");
      await signOut();
      clearAuth();
      clearLog();
      clearChat();
      router.replace("/");
    } catch {
      setError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Card className="border-red-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-red-600">
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-500 leading-relaxed">
          Deleting your account permanently removes all your health data,
          conversations, and logs. This cannot be undone.
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!confirming ? (
          <Button
            variant="outline"
            onClick={() => setConfirming(true)}
            className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300">
            Delete my account
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-red-700 mb-0.5">
                Are you absolutely sure?
              </p>
              <p className="text-xs text-red-500">
                All data will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                className="flex-1 text-gray-500"
                disabled={deleting}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DangerZone;