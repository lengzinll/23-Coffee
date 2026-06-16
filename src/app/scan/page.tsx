"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { XCircle, Coffee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function ScanContent() {
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const hasClaimed = useRef(false);

  useEffect(() => {
    if (hasClaimed.current) return;
    hasClaimed.current = true;

    const claim = async () => {
      try {
        // 1. Check login status — if 401, user is not logged in
        const meRes = await fetch("/api/auth/me");

        const isLoggedIn = meRes.status === 200;

        if (!isLoggedIn) {
          // Redirect to login with the current page path as return destination
          const currentPath = window.location.pathname;
          router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        const meBody = await meRes.json();

        if (meBody.user?.role === "admin") {
          setStatus("error");
          setMessage("Admin accounts cannot claim stamps.");
          return;
        }

        // 2. Claim the stamp
        const res = await fetch("/api/scan/qr/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const result = await res.json();

        if (res.ok && result.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(result.message || "Failed to claim stamp. Please try again.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    claim();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      {/* Logo */}
      <div className="relative w-48 h-28 mb-8">
        <Image
          src="/23_coffee.png"
          alt="23 Coffee"
          fill
          className="object-contain drop-shadow-[0_0_20px_rgba(160,90,50,0.5)]"
          priority
        />
      </div>

      {/* Status Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-14 w-14 text-amber-500 animate-spin" />
            <p className="text-zinc-400 text-base font-medium">កំពុងដំណើរការ...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center">
              <Coffee className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-400 mb-1">រង់ចាំការអនុម័ត!</h2>
              <p className="text-zinc-400 text-sm">
                សំណើត្រារបស់អ្នកត្រូវបានផ្ញើទៅកាន់ Admin ។<br />
                នឹងត្រូវបានអនុម័តក្នុងពេលឆាប់ៗ ☕
              </p>
            </div>
            <Button
              asChild
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold h-11 rounded-xl border border-zinc-700"
            >
              <Link href="/dashboard/stamps">មើលស្ថានភាពត្រា</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400/50 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-red-400 mb-2">មានបញ្ហា</h2>
              <p className="text-zinc-400 text-sm">{message}</p>
            </div>
            <Button
              asChild
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold h-11 rounded-xl border border-zinc-700"
            >
              <Link href="/">ទៅទំព័រដើម</Link>
            </Button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-600">23 Coffee · Loyalty Stamp System</p>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
