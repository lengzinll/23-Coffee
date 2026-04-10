"use client";

import { Loader2 } from "lucide-react";

export function LoadingScreen({
  message = "កំពុងផ្ទុក...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm font-medium text-zinc-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}
