"use client";

import useSWR from "swr";
import { rpc } from "@/lib/rpc";
import {
  type ApiScanWithUser as ApiStampWithUser,
  type ApiScan as ApiStamp,
  type ApiUser,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User as UserIcon,
  Search,
  ChevronDown,
  ChevronRight,
  Gift,
  CheckCircle2,
  Coffee,
  Trash2,
  Undo2,
  X,
  QrCode,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { cn, formatDate } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QRCode from "react-qr-code";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────────────────────
// buildCycles — reconstructs stamp cycles respecting historical cycle sizes.
//
// Problem: if STAMPS_PER_CYCLE changes (e.g. 4 → 6), naively re-partitioning
// all approved stamps by the new number breaks every past cycle.
//
// Solution: each redeemed record carries stamps_per_cycle (the size that was
// active at the time of redemption). We consume approved stamps in chunks of
// those historical sizes for past cycles, then use currentStampsPerCycle for
// the current in-progress cycle.
// ─────────────────────────────────────────────────────────────────────────────
type StampCycle = {
  cycleIndex: number;
  stamps: ApiStamp[];          // approved/pending slots for this cycle
  cycleSize: number;           // how many stamps this cycle requires
  isComplete: boolean;         // all cycleSize slots are approved
  isRedeemed: boolean;         // this cycle has been redeemed
  isPendingRedemption: boolean;
  redeemedRecord: ApiStamp | null; // the redeemed DB row (for undo)
};

function buildCycles(
  allStamps: ApiStamp[],
  currentStampsPerCycle: number,
): StampCycle[] {
  // Approved stamps in chronological order (oldest first)
  const approved = allStamps
    .filter((s) => s.status === "approved")
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });

  // Redeemed records in chronological order (oldest first)
  const redeemed = allStamps
    .filter((s) => s.status === "redeemed")
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });

  // Pending stamps (for display in the current in-progress cycle)
  const pending = allStamps
    .filter((s) => s.status === "pending")
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });

  const cycles: StampCycle[] = [];
  let approvedCursor = 0;

  // ── Past (redeemed) cycles — each uses its own recorded size ─────────────
  redeemed.forEach((redeemedRecord, idx) => {
    // Use the snapshotted cycle size; fall back to global if null (legacy rows)
    const cycleSize = redeemedRecord.stamps_per_cycle ?? currentStampsPerCycle;
    const cycleStamps = approved.slice(approvedCursor, approvedCursor + cycleSize);
    approvedCursor += cycleSize;

    cycles.push({
      cycleIndex: idx,
      stamps: cycleStamps,
      cycleSize,
      isComplete: true,
      isRedeemed: true,
      isPendingRedemption: false,
      redeemedRecord,
    });
  });

  // ── Remaining approved stamps → may form complete (unclaimed) cycles ──────
  const remaining = approved.slice(approvedCursor);
  let remainingCursor = 0;

  while (remainingCursor + currentStampsPerCycle <= remaining.length) {
    const cycleStamps = remaining.slice(remainingCursor, remainingCursor + currentStampsPerCycle);
    remainingCursor += currentStampsPerCycle;
    cycles.push({
      cycleIndex: cycles.length,
      stamps: cycleStamps,
      cycleSize: currentStampsPerCycle,
      isComplete: true,
      isRedeemed: false,
      isPendingRedemption: true,
      redeemedRecord: null,
    });
  }

  // ── Current in-progress cycle (partial approved + pending) ───────────────
  const inProgressApproved = remaining.slice(remainingCursor);
  const inProgressStamps = [...inProgressApproved, ...pending];
  cycles.push({
    cycleIndex: cycles.length,
    stamps: inProgressStamps,
    cycleSize: currentStampsPerCycle,
    isComplete: false,
    isRedeemed: false,
    isPendingRedemption: false,
    redeemedRecord: null,
  });

  return cycles;
}

const UserStampCard = ({
  user,
  stamps,
  STAMPS_PER_CYCLE,
}: {
  user: ApiUser;
  stamps: ApiStamp[];
  STAMPS_PER_CYCLE: number;
}) => {
  const approvedStamps = stamps.filter((s) => s.status === "approved");
  const completedCycles = stamps.filter((s) => s.status === "redeemed").length;

  // Build historically-accurate cycles using per-redeemed snapshots
  const cycles = buildCycles(stamps, STAMPS_PER_CYCLE);
  const unclaimedRewards = cycles.filter((c) => c.isPendingRedemption).length;

  return (
    <div className="flex flex-col items-center justify-center px-1 w-full -translate-y-5 gap-6">
      {/* Alert banner if there are unclaimed rewards */}
      {unclaimedRewards > 0 && (
        <div className="w-full max-w-105 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] p-2 flex items-center gap-3 animate-pulse shadow-lg shadow-emerald-950/20">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-left">
            <h4 className="text-emerald-400 text-xs font-black uppercase tracking-wider">
              អ្នកមានរង្វាន់មិនទាន់បើកយក! / Unclaimed Reward!
            </h4>
            <p className="text-zinc-300 text-[11px] mt-0.5 leading-relaxed">
              សូមបង្ហាញកាតនេះទៅកាន់បុគ្គលិកនៅបញ្ជរ ដើម្បីទទួលបានកាហ្វេឥតគិតថ្លៃចំនួន {unclaimedRewards} កែវ។
            </p>
          </div>
        </div>
      )}

      {/* Render all cycles, newest on top */}
      {[...cycles].reverse().map((cycle) => {
        const cycleApproved = cycle.stamps.filter((s) => s.status === "approved");

        return (
          <div
            key={cycle.cycleIndex}
            className="w-full max-w-105 flex flex-col gap-2 animate-in fade-in duration-500"
          >
            {/* Cycle Title and Badges */}
            <div className="flex justify-between items-center px-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                ជុំទី {cycle.cycleIndex + 1} / Cycle {cycle.cycleIndex + 1}
              </span>
              {cycle.isPendingRedemption && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full animate-bounce">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  មិនទាន់បើកយក / Unclaimed
                </span>
              )}
              {cycle.isRedeemed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-800/40 border border-zinc-800 px-2 py-0.5 rounded-full">
                  បានបើកយក ✓ / Redeemed
                </span>
              )}
              {!cycle.isComplete && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-full">
                  កំពុងប្រមូល / In Progress
                </span>
              )}
            </div>

            {/* The Card */}
            <div
              className={cn(
                "relative w-full bg-[#3c3532] rounded-2xl shadow-2xl overflow-hidden border border-black/20 transition-all duration-500 flex flex-col justify-between",
                cycle.isPendingRedemption &&
                "ring-4 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.01]",
                cycle.isRedeemed && "opacity-50 saturate-50",
              )}
            >
              {/* Coffee Bean Pattern Background */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
                <svg
                  width="100%"
                  height="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <mask id="bean-mask">
                      <rect
                        x="-20"
                        y="-20"
                        width="40"
                        height="40"
                        fill="white"
                      />
                      <path
                        d="M 1,-12 C -6,-5 6,5 0,12"
                        fill="none"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </mask>
                    <g id="coffee-bean">
                      <ellipse
                        cx="0"
                        cy="0"
                        rx="9"
                        ry="13"
                        fill="#000"
                        mask="url(#bean-mask)"
                      />
                    </g>
                    <pattern
                      id="beans-pattern"
                      x="0"
                      y="0"
                      width="100"
                      height="100"
                      patternUnits="userSpaceOnUse"
                    >
                      <use
                        href="#coffee-bean"
                        x="20"
                        y="20"
                        transform="rotate(-30 20 20)"
                      />
                      <use
                        href="#coffee-bean"
                        x="70"
                        y="50"
                        transform="rotate(25 70 50)"
                      />
                      <use
                        href="#coffee-bean"
                        x="40"
                        y="85"
                        transform="rotate(75 40 85)"
                      />
                      <use
                        href="#coffee-bean"
                        x="85"
                        y="15"
                        transform="rotate(-60 85 15)"
                      />
                    </pattern>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="url(#beans-pattern)"
                  />
                </svg>
              </div>

              {/* Redeemed Vintage Stamp Overlay */}
              {cycle.isRedeemed && (
                <div className="absolute inset-0 bg-black/30 z-20 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-zinc-500 text-zinc-500 font-black text-xl min-[420px]:text-2xl uppercase tracking-widest px-4 py-2 rounded-xl rotate-12 transform scale-110 opacity-90 select-none bg-[#3c3532]/90 shadow-lg border-dashed">
                    ប្រើរួច / REDEEMED
                  </div>
                </div>
              )}

              {/* Card Content */}
              <div className="relative h-full p-4 min-[420px]:p-5 flex flex-col justify-between z-10">
                {/* Header Row */}
                <div className="flex justify-between items-start pt-1 mb-2 min-[420px]:mb-4">
                  {/* Name Box */}
                  <div className="bg-[#dcd3c1] w-[50vw] max-w-55 h-8 min-[420px]:min-[420px]:h-9.5 rounded-lg px-2 min-[420px]:px-3 flex flex-col justify-center relative shadow-inner">
                    <span className="text-[#3c3532] text-[7px] font-bold uppercase tracking-widest leading-none mb-0.5">
                      Name
                    </span>
                    <span className="text-[#3c3532] text-sm font-black uppercase truncate leading-none">
                      {user.username}
                    </span>
                  </div>

                  {/* Logo/Steam section */}
                  <div className="flex flex-col items-center pr-1 -translate-y-1.25">
                    <div className="flex gap-0.5 mb-0.5">
                      {[1, 2, 3].map((i) => (
                        <svg
                          key={i}
                          width="8"
                          height="18"
                          viewBox="0 0 10 20"
                          className="opacity-80"
                        >
                          <path
                            d="M2 18 Q 8 14 2 10 Q 8 6 2 2"
                            stroke="#dcd3c1"
                            fill="none"
                            strokeWidth="1.5"
                          />
                        </svg>
                      ))}
                    </div>
                    <div className="text-right flex flex-col items-center">
                      <span className="text-[#dcd3c1] text-[12px] font-black uppercase leading-[0.8] tracking-tight">
                        23
                      </span>
                      <span className="text-[#dcd3c1] text-[8px] font-bold uppercase leading-none tracking-[0.2em] mt-1">
                        Coffee
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stamp Grid — sized to cycle.cycleSize, not the global constant */}
                <div className="items-center px-1 min-[420px]:px-4 flex flex-wrap gap-4 justify-start">
                  {Array.from({ length: cycle.cycleSize }).map(
                    (_, slotIndex) => {
                      const stamp = cycle.stamps[slotIndex];
                      const isApproved = stamp?.status === "approved";
                      const isPending = stamp?.status === "pending";

                      return (
                        <div
                          key={slotIndex}
                          className={cn(
                            "w-[13vw] max-w-13.75 aspect-square rounded-full border-[1.5px] border-[#dcd3c1] flex items-center justify-center relative transition-all duration-300",
                            isApproved ? "bg-[#dcd3c1]" : "bg-transparent",
                          )}
                        >
                          {isApproved ? (
                            <Image
                              width={100}
                              height={100}
                              src="/23_coffee.png"
                              className="w-full h-full object-contain p-0 drop-shadow-md scale-[1.35] -rotate-12"
                              alt="Stamp"
                              sizes="100vw"
                            />
                          ) : isPending ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <div className="h-4.5 w-4.5 rounded-full border border-amber-500/50 border-t-amber-400 animate-spin" />
                              <span className="text-[7px] font-black text-amber-400 uppercase tracking-tighter">
                                រង់ចាំ
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#dcd3c1]/40 text-xs font-black">
                              {slotIndex + 1}
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Dynamic Progress Footer */}
                <div className="text-center px-2 min-[420px]:px-4 pt-4">
                  <p className="text-[#dcd3c1] text-[11px] min-[420px]:text-[13px] leading-[1.2] uppercase font-black tracking-[0.05em] italic drop-shadow-sm">
                    {cycle.isPendingRedemption ? (
                      <span className="text-emerald-400">
                        រួចរាល់ហើយ! សូមបើកយករង្វាន់កាហ្វេឥតគិតថ្លៃ ☕️
                      </span>
                    ) : cycle.isRedeemed ? (
                      <span className="text-zinc-400">
                        បានបើករង្វាន់រួចរាល់ ✓
                      </span>
                    ) : (
                      <>
                        ប្រមូលត្រាឱ្យបាន{" "}
                        {cycle.cycleSize - cycleApproved.length} ទៀត
                        ដើម្បីទទួលបានកាហ្វេ ១ កែវឥតគិតថ្លៃ។
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}




      {/* Stats beneath card */}
      <div className="mt-8 flex flex-col items-center gap-4 w-full animate-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center gap-8 bg-[#3c3532]/30 px-6 py-3 rounded-2xl border border-[#dcd3c1]/10">
          <div className="flex flex-col items-center">
            <span className="text-[#dcd3c1]/50 text-[9px] uppercase font-bold tracking-widest">
              ទទួលបានសរុប
            </span>
            <span className="text-lg font-black text-[#dcd3c1]">
              {approvedStamps.length}
            </span>
          </div>
          <div className="w-px h-8 bg-[#dcd3c1]/10" />
          <div className="flex flex-col items-center">
            <span className="text-[#dcd3c1]/50 text-[9px] uppercase font-bold tracking-widest">
              រង្វាន់ដែលទទួលបាន
            </span>
            <span className="text-lg font-black text-[#dcd3c1] drop-shadow-[0_0_8px_rgba(220,211,193,0.3)]">
              {completedCycles}
            </span>
          </div>
          {unclaimedRewards > 0 && (
            <>
              <div className="w-px h-8 bg-[#dcd3c1]/10" />
              <div className="flex flex-col items-center">
                <span className="text-emerald-400 text-[9px] uppercase font-bold tracking-widest animate-pulse">
                  រង្វាន់មិនទាន់បើក
                </span>
                <span className="text-lg font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                  {unclaimedRewards}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const fetcher = async (): Promise<ApiStampWithUser[]> => {
  const res = await rpc.scan.$get();
  if (!res.ok) throw new Error("Failed to fetch stamps");
  const result = await res.json();
  return result.data;
};

const usersFetcher = async (): Promise<ApiUser[]> => {
  const res = await rpc.user.$get();
  if (!res.ok) throw new Error("Failed to fetch users");
  const result = await res.json();
  return result.data;
};

const meFetcher = async () => {
  const res = await rpc.auth.me.$get();
  if (!res.ok) return null;
  const result = (await res.json()) as {
    success: boolean;
    user?: { id: number; username: string; role: string };
  };
  return result.success ? result.user : null;
};

const settingsFetcher = async () => {
  const res = await rpc.settings.$get();
  if (!res.ok) throw new Error("Failed to fetch settings");
  const result = await res.json();
  return result.data;
};

type GroupedStamp = {
  user: ApiUser | null;
  stamps: ApiStamp[];
};

const defaultStamp = 6;

export default function StampsPage() {
  const { data: currentUser } = useSWR("/api/auth/me", meFetcher);
  const { data, isLoading, error, mutate } = useSWR("/api/scan", fetcher, {
    refreshInterval: 5000,
  });
  const {
    data: usersData,
    isLoading: isUsersLoading,
    error: usersError,
  } = useSWR(currentUser?.role === "admin" ? "/api/user" : null, usersFetcher);
  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useSWR("/api/settings", settingsFetcher);

  const STAMPS_PER_CYCLE = settingsData?.STAMPS_PER_CYCLE
    ? parseInt(settingsData.STAMPS_PER_CYCLE, 10)
    : defaultStamp;

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>(
    {},
  );
  const [mounted, setMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [approvingStampId, setApprovingStampId] = useState<number | null>(null);

  // QR Code state
  const [qrScanUrl, setQrScanUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserForStamp, setSelectedUserForStamp] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [stampToDelete, setStampToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserForRedeem, setSelectedUserForRedeem] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [rewardAlert, setRewardAlert] = useState<{
    username: string;
    totalStamps: number;
  } | null>(null);

  // Poll for updates every 5 seconds to simulate real-time (since WebSockets don't work with Vercel Edge Runtime)
  // useEffect(() => {
  //   if (!currentUser) return;

  //   const intervalId = setInterval(() => {
  //     mutate(); // Refresh the stamps list every 5 seconds
  //   }, 5000);

  //   return () => clearInterval(intervalId);
  // }, [currentUser, mutate]);

  // ── QR Code ─────────────────────────────────────────────────────────────────
  const handleGenerateQr = useCallback(async () => {
    if (isGeneratingQr) return;
    setIsGeneratingQr(true);

    try {
      // Build the scan URL from the browser's actual origin — works on any domain
      const scanUrl = `${window.location.origin}/scan`;
      setQrScanUrl(scanUrl);
      setIsQrModalOpen(true);
    } catch {
      toast.error("Failed to generate QR code");
    } finally {
      setIsGeneratingQr(false);
    }
  }, [isGeneratingQr]);

  const handleCloseQr = useCallback(() => {
    setIsQrModalOpen(false);
  }, []);

  const handleApproveStamp = useCallback(
    async (stampId: number, action: "approved" | "rejected") => {
      if (approvingStampId !== null) return;
      setApprovingStampId(stampId);
      try {
        const res = await fetch("/api/scan/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stampId, action }),
        });
        const result = await res.json();
        if (res.ok && result.success) {
          toast.success(
            action === "approved" ? "បានអនុម័តត្រា ✓" : "បានបដិសេធត្រា",
          );
          mutate();
        } else {
          toast.error(result.message || "ដំណើរការបរាជ័យ");
        }
      } catch {
        toast.error("មានបញ្ហាក្នុងការភ្ជាប់");
      } finally {
        setApprovingStampId(null);
      }
    },
    [approvingStampId, mutate],
  );

  const handleDownloadQr = useCallback(async () => {
    const posterEl = document.getElementById("qr-poster-download");
    if (!posterEl || !qrScanUrl) return;

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(posterEl, {
        pixelRatio: 4, // 4× → ~1280px wide, crisp for printing
        cacheBust: true,
        backgroundColor: "#f5f0e8",
      });
      const link = document.createElement("a");
      link.download = "23coffee-stamp-qr.png";
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Failed to download poster");
    }
  }, [qrScanUrl]);

  const handleManualAddClick = (userId: number, username: string) => {
    setSelectedUserForStamp({ id: userId, username });
    setIsDialogOpen(true);
  };

  const handleManualAddConfirm = useCallback(async () => {
    if (isAdding || !selectedUserForStamp) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserForStamp.id }),
      });
      const result = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (res.ok && result.success === true) {
        toast.success(`បានបន្ថែមត្រាសម្រាប់ ${selectedUserForStamp.username}`);
        mutate();
      } else {
        toast.error(result.message || "ការបន្ថែមតែមបរាជ័យ");
      }
    } catch (err) {
      console.error(err);
      toast.error("មានកំហុសមួយបានកើតឡើងក្នុងអំឡុងពេលបន្ថែមតែម");
    } finally {
      setIsAdding(false);
      setIsDialogOpen(false);
      setSelectedUserForStamp(null);
    }
  }, [isAdding, mutate, selectedUserForStamp]);

  const handleRedeemReward = useCallback(async () => {
    if (isRedeeming || !selectedUserForRedeem) return;

    setIsRedeeming(true);
    try {
      const res = await rpc.scan.redeem.$post({
        json: { userId: selectedUserForRedeem.id },
      });

      const result = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (res.ok && result.success === true) {
        toast.success(
          `បានប្រគល់រង្វាន់ឥតគិតថ្លៃឲ្យ ${selectedUserForRedeem.username} ✓`,
        );
        mutate();
      } else {
        toast.error(result.message || "ការប្រគល់រង្វាន់បរាជ័យ");
      }
    } catch (err) {
      console.error(err);
      toast.error("មានកំហុសមួយបានកើតឡើង");
    } finally {
      setIsRedeeming(false);
      setIsRedeemDialogOpen(false);
      setSelectedUserForRedeem(null);
    }
  }, [isRedeeming, mutate, selectedUserForRedeem]);

  const handleDeleteStamp = useCallback(
    async (id: number) => {
      if (isDeleting) return;

      setIsDeleting(true);
      try {
        const res = await fetch(`/api/scan/${id}`, { method: "DELETE" });
        const result = (await res.json()) as {
          success: boolean;
          message?: string;
        };

        if (res.ok && result.success === true) {
          toast.success("លុបត្រាបានសម្រេច");
          mutate();
        } else {
          toast.error(result.message || "ការលុបត្រាបានបរាជ័យ");
        }
      } catch (err) {
        console.error(err);
        toast.error("មានកំហុសមួយបានកើតឡើងក្នុងអំឡុងពេលលុបត្រា");
      } finally {
        setIsDeleting(false);
        setStampToDelete(null);
        setIsDeleteDialogOpen(false);
      }
    },
    [isDeleting, mutate],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const onOpenChange = (userId: number, open: boolean) => {
    setExpandedUsers((prev) => ({ ...prev, [userId]: open }));
  };

  const groupedData = useMemo(() => {
    if (!data || !currentUser) return [];

    const groups: Record<number, GroupedStamp> = {};

    if (currentUser.role === "admin") {
      if (!usersData) return [];
      usersData.forEach((user) => {
        if (user.role === "user") {
          groups[user.id] = {
            user,
            stamps: [],
          };
        }
      });
    } else {
      groups[currentUser.id] = {
        user: currentUser as unknown as ApiUser,
        stamps: [],
      };
    }

    data.forEach((item) => {
      if (item.user && item.user.role !== "user") return;

      const userId = item.scan_history.user_id || 0;
      if (!groups[userId]) {
        groups[userId] = {
          user: item.user,
          stamps: [],
        };
      }
      groups[userId].stamps.push(item.scan_history);
    });

    Object.values(groups).forEach((group) => {
      group.stamps.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });
    });

    // Filter by search and status
    const result = Object.values(groups).filter((group) => {
      const username = group.user?.username || "Unknown";
      const matchesSearch =
        !searchTerm ||
        username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.stamps.some((s) =>
          s.status.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      return matchesSearch;
    });

    // Sort by latest stamp first, then by user creation time descending
    result.sort((a, b) => {
      const latestStampA = a.stamps[0]?.timestamp
        ? new Date(a.stamps[0].timestamp).getTime()
        : 0;
      const latestStampB = b.stamps[0]?.timestamp
        ? new Date(b.stamps[0].timestamp).getTime()
        : 0;
      if (latestStampA !== latestStampB) return latestStampB - latestStampA;

      const userA = a.user?.timestamp
        ? new Date(a.user.timestamp).getTime()
        : 0;
      const userB = b.user?.timestamp
        ? new Date(b.user.timestamp).getTime()
        : 0;
      return userB - userA;
    });

    return result;
  }, [data, usersData, currentUser, searchTerm]);

  const singleUserStamps = groupedData[0]?.stamps.filter(
    (r) => r.status === "approved",
  );

  if (error || usersError || settingsError)
    return (
      <div className="p-6 text-destructive">
        មានបញ្ហា៖{" "}
        {error?.message || usersError?.message || settingsError?.message}
      </div>
    );
  if (isLoading || isUsersLoading || isSettingsLoading)
    return <LoadingScreen message="កំពុងទាញយកប្រវត្តិនៃការសន្សំតែម..." />;
  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Full-screen Reward Alert Overlay ── */}
      {rewardAlert && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          onClick={() => setRewardAlert(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" />

          {/* Pulsing glow rings */}
          <div className="absolute w-[420px] h-[420px] rounded-full bg-emerald-500/10 animate-ping" />
          <div className="absolute w-[320px] h-[320px] rounded-full bg-emerald-500/15 animate-ping [animation-delay:150ms]" />
          <div className="absolute w-[220px] h-[220px] rounded-full bg-emerald-500/20 animate-ping [animation-delay:300ms]" />

          {/* Card */}
          <div
            className="relative z-10 bg-[#1a1a1a] border-2 border-emerald-500/60 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_80px_rgba(16,185,129,0.4)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setRewardAlert(null)}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto mb-5">
              <Coffee className="h-10 w-10 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-black text-emerald-400 mb-1">
              រង្វាន់ត្រូវប្រគល់! ☕️
            </h2>
            <p className="text-zinc-200 text-lg font-bold mb-1">
              {rewardAlert.username}
            </p>
            <p className="text-zinc-400 text-sm mb-6">
              ប្រមូលបាន {rewardAlert.totalStamps} ត្រាហើយ!
              កាហ្វេបន្ទាប់របស់អ្នកគឺឥតគិតថ្លៃ។
            </p>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black h-12 text-base rounded-xl gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              onClick={() => setRewardAlert(null)}
            >
              <CheckCircle2 className="h-5 w-5" />
              យល់ត្រាប់ហើយ
            </Button>
          </div>
        </div>
      )}
      {currentUser?.role === "admin" && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-primary">ត្រារបស់អតិថិជន</h1>
            <p className="text-sm text-zinc-400 mt-1">
              តាមដានដំណើរការរបស់អតិថិជន។ ត្រាចំនួន {STAMPS_PER_CYCLE} = កាហ្វេ ១
              កែវឥតគិតថ្លៃ។
            </p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button
              onClick={handleGenerateQr}
              disabled={isGeneratingQr}
              className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2 h-10 px-4 rounded-lg shadow-lg shadow-amber-900/30"
            >
              <QrCode className="h-4 w-4" />
              {isGeneratingQr ? "កំពុងបង្កើត..." : "បង្កើត QR"}
            </Button>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="ស្វែងរកអតិថិជន..."
                className="h-10 pl-10 bg-zinc-900 border-zinc-800 text-zinc-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-2 mt-5">
        {groupedData.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
            <UserIcon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">
              រកមិនឃើញអតិថិជនដូចនឹងការស្វែងរករបស់អ្នកទេ។
            </p>
          </div>
        ) : currentUser?.role === "admin" ? (
          groupedData.map((group, index) => {
            const userId = group.user?.id || 0;
            const isExpanded = expandedUsers[userId];
            const approvedStamps = group.stamps.filter(
              (s) => s.status === "approved",
            );
            const redeemedCount = group.stamps.filter(
              (s) => s.status === "redeemed",
            ).length;
            const totalStamps = group.stamps.length;

            // Use buildCycles for historically-accurate cycle state
            const adminCycles = buildCycles(group.stamps, STAMPS_PER_CYCLE);
            const hasUnredeemedReward = adminCycles.some((c) => c.isPendingRedemption);
            const currentCycle = adminCycles[adminCycles.length - 1];
            const currentCycleCount = currentCycle.stamps.filter((s) => s.status === "approved").length;

            return (
              <Collapsible
                key={userId}
                open={isExpanded}
                onOpenChange={(open) => onOpenChange(userId, open)}
                className="w-full"
              >
                <Card
                  className={cn(
                    "bg-zinc-900 gap-0 border-zinc-800 overflow-hidden transition-colors p-0!",
                    hasUnredeemedReward
                      ? "border-emerald-500/40 hover:border-emerald-500/70"
                      : "hover:border-zinc-700",
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer select-none py-3 px-4 flex flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-primary font-bold hidden sm:inline">
                          {index + 1}.
                        </span>
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center border shrink-0",
                            hasUnredeemedReward
                              ? "bg-emerald-500/20 border-emerald-500/40"
                              : "bg-primary/10 border-primary/20",
                          )}
                        >
                          {hasUnredeemedReward ? (
                            <Gift className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <UserIcon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold text-zinc-100 truncate flex items-center gap-2">
                            {group.user?.username || "អ្នកប្រើប្រាស់ទូទៅ"}
                            {group.stamps.filter((s) => s.status === "pending")
                              .length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full animate-pulse">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                  {
                                    group.stamps.filter(
                                      (s) => s.status === "pending",
                                    ).length
                                  }{" "}
                                  រង់ចាំ
                                </span>
                              )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            {hasUnredeemedReward ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                <Coffee className="h-2.5 w-2.5" />
                                រង្វាន់ត្រូវប្រគល់!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <Clock className="h-2.5 w-2.5" />
                                {group.user?.timestamp
                                  ? formatDate(group.user.timestamp)
                                  : "តាំងពីយូរ"}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {hasUnredeemedReward && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold shrink-0">
                            <Gift className="h-3.5 w-3.5 animate-bounce" />
                            <span className="hidden sm:inline">
                              ត្រូវប្រគល់!
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            {redeemedCount > 0 && (
                              <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/30 font-bold text-[10px] h-5 py-0 px-1.5">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                <span className="hidden xs:inline">
                                  {redeemedCount} ប្រើហើយ
                                </span>
                                <span className="xs:hidden">
                                  {redeemedCount}
                                </span>
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-zinc-950/50 border-zinc-800 text-zinc-500 text-[10px] h-5 py-0 px-1.5 whitespace-nowrap"
                            >
                              សរុប៖ {approvedStamps.length}
                            </Badge>
                          </div>
                          <div className="w-20 sm:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                hasUnredeemedReward
                                  ? "bg-emerald-500"
                                  : "bg-primary",
                              )}
                              style={{
                                width: `${(currentCycleCount / STAMPS_PER_CYCLE) * 100}%`,
                              }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-[9px] uppercase tracking-wider font-bold mt-0.5",
                              hasUnredeemedReward
                                ? "text-emerald-500"
                                : "text-zinc-500",
                            )}
                          >
                            {currentCycleCount}/{STAMPS_PER_CYCLE}{" "}
                            <span className="hidden xs:inline">
                              {hasUnredeemedReward ? "ឥតគិតថ្លៃ!" : "បន្ទាប់"}
                            </span>
                          </span>
                        </div>
                        <div className="h-8 w-8 flex items-center justify-center text-zinc-600">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-zinc-800/50 bg-black/10 p-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    <div className="space-y-4">
                      {/* ── Pending stamps section ── */}
                      {(() => {
                        const pendingStamps = group.stamps.filter(
                          (s) => s.status === "pending",
                        );
                        if (pendingStamps.length === 0) return null;
                        return (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                                រង់ចាំការអនុម័ត ({pendingStamps.length})
                              </span>
                            </div>
                            {pendingStamps.map((stamp) => (
                              <div
                                key={stamp.id}
                                className="flex items-center justify-between gap-3 bg-zinc-900 rounded-lg px-3 py-2"
                              >
                                <span className="text-[11px] text-zinc-400 tabular-nums">
                                  {stamp.timestamp
                                    ? formatDate(stamp.timestamp)
                                    : "—"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={approvingStampId === stamp.id}
                                    onClick={() =>
                                      handleApproveStamp(stamp.id, "approved")
                                    }
                                    className="flex items-center gap-1 h-7 px-3 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition-colors disabled:opacity-40"
                                  >
                                    {approvingStampId === stamp.id
                                      ? "..."
                                      : "✓ អនុម័ត"}
                                  </button>
                                  <button
                                    disabled={approvingStampId === stamp.id}
                                    onClick={() =>
                                      handleApproveStamp(stamp.id, "rejected")
                                    }
                                    className="flex items-center gap-1 h-7 px-3 rounded-md bg-red-600/20 hover:bg-red-600/40 text-red-400 text-[11px] font-bold border border-red-500/30 transition-colors disabled:opacity-40"
                                  >
                                    {approvingStampId === stamp.id
                                      ? "..."
                                      : "✕ បដិសេធ"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Group stamps into cycles — using buildCycles for historical accuracy */}
                      {[...adminCycles].reverse().map((cycle) => {
                        return (
                          <div key={cycle.cycleIndex} className="relative">
                            <div className="flex items-center gap-3 mb-4">
                              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">
                                ជុំទី {cycle.cycleIndex + 1}
                              </h4>
                              {cycle.isRedeemed && (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                                    <CheckCircle2 className="h-3 w-3" />
                                    ប្រើហើយ ✓
                                  </div>
                                  {cycle.redeemedRecord && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:text-amber-400 text-zinc-400 gap-1.5 shadow-none transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setStampToDelete(
                                          cycle.redeemedRecord!.id,
                                        );
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Undo2 className="h-3 w-3" />
                                      បោះបង់ការប្រើ
                                    </Button>
                                  )}
                                </div>
                              )}
                              {cycle.isPendingRedemption && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase animate-pulse">
                                  <Gift className="h-3 w-3" />
                                  រង្វាន់ត្រូវប្រគល់!
                                </div>
                              )}
                              <div className="flex-1 h-px bg-zinc-800" />
                            </div>

                            {/* Redeem button — shown above the grid for the pending cycle */}
                            {cycle.isPendingRedemption && (
                              <div className="relative mb-4">
                                <span className="absolute inset-0 rounded-xl animate-ping bg-emerald-400 opacity-20 pointer-events-none" />
                                <Button
                                  className="relative w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-white font-black text-sm h-11 gap-2 shadow-[0_0_24px_rgba(16,185,129,0.5)] border border-emerald-400/40 transition-all duration-150 rounded-xl"
                                  onClick={() => {
                                    setSelectedUserForRedeem({
                                      id: userId,
                                      username:
                                        group.user?.username || "Guest",
                                    });
                                    setIsRedeemDialogOpen(true);
                                  }}
                                >
                                  <Coffee className="h-5 w-5" />
                                  ប្រគល់កាហ្វេឥតគិតថ្លៃ ☕
                                </Button>
                              </div>
                            )}

                            {/* Slot grid — sized to cycle.cycleSize for historical accuracy */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                              {Array.from({ length: cycle.cycleSize }).map(
                                (_, slotIndex) => {
                                  const stamp = cycle.stamps[slotIndex];

                                  return (
                                    <div
                                      key={slotIndex}
                                      onClick={
                                        !stamp &&
                                          currentUser?.role === "admin"
                                          ? () =>
                                            handleManualAddClick(
                                              userId,
                                              group.user?.username ||
                                              "Guest",
                                            )
                                          : undefined
                                      }
                                      className={cn(
                                        "aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all p-0 relative group overflow-hidden",
                                        stamp
                                          ? "bg-zinc-800/50 border-zinc-700 shadow-lg shadow-black/20"
                                          : "bg-transparent border-dashed border-zinc-800",
                                        !stamp &&
                                        currentUser?.role === "admin" &&
                                        "cursor-pointer hover:border-primary/50 hover:bg-primary/5",
                                      )}
                                    >
                                      {stamp ? (
                                        <>
                                          {stamp.status === "approved" ? (
                                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500 p-0">
                                              <Image
                                                width={100}
                                                height={100}
                                                sizes="100vw"
                                                src="/23_coffee.png"
                                                alt="Stamp"
                                                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] -rotate-12 group-hover:rotate-0 transition-transform duration-500 scale-[1.25]"
                                              />
                                            </div>
                                          ) : stamp.status === "pending" ? (
                                            /* Pending in grid — simple indicator, actions are in the section above */
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                              <div className="h-5 w-5 rounded-full border-2 border-amber-500/50 border-t-amber-400 animate-spin" />
                                              <span className="text-[8px] font-bold text-amber-500/70 uppercase tracking-wide">
                                                រង់ចាំ
                                              </span>
                                            </div>
                                          ) : (
                                            <Badge
                                              className={cn(
                                                "capitalize",
                                                stamp.status ===
                                                "rejected" &&
                                                "bg-red-500 text-white",
                                              )}
                                            >
                                              {stamp.status}
                                            </Badge>
                                          )}
                                          {currentUser?.role ===
                                            "admin" && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-8 w-8 text-white/50 hover:text-red-500 hover:bg-red-500/20 transition-colors z-20 backdrop-blur-sm rounded-full"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setStampToDelete(stamp.id);
                                                  setIsDeleteDialogOpen(true);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full text-center z-10">
                                            <span className="text-[10px] text-zinc-100 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 font-medium">
                                              {stamp.timestamp
                                                ? formatDate(
                                                  stamp.timestamp,
                                                )
                                                : "-"}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="h-6 w-6 rounded-full border border-zinc-800 flex items-center justify-center">
                                            <span className="text-xs text-zinc-700 font-bold">
                                              {slotIndex + 1}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-zinc-800 font-medium">
                                            ចាក់សោ
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        ) : (
          groupedData[0] && (
            <UserStampCard
              user={groupedData[0].user!}
              stamps={groupedData[0].stamps}
              STAMPS_PER_CYCLE={STAMPS_PER_CYCLE}
            />
          )

          // <p>hello</p>
        )}
      </div>

      {/* Redeem Reward Dialog */}
      <AlertDialog
        open={isRedeemDialogOpen}
        onOpenChange={setIsRedeemDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold flex items-center gap-2">
              <Coffee className="h-5 w-5 text-emerald-400" />
              ប្រគល់កាហ្វេឥតគិតថ្លៃ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              បញ្ជាក់ថាអ្នកបានប្រគល់កាហ្វេឥតគិតថ្លៃឲ្យ{" "}
              <span className="font-bold text-emerald-400">
                {selectedUserForRedeem?.username}
              </span>{" "}
              ហើយ? សកម្មភាពនេះនឹងកត់ត្រាការប្រើប្រាស់រង្វាន់
              និងចាប់ផ្ដើមជុំថ្មី។
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">
              បោះបង់
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRedeemReward();
              }}
              disabled={isRedeeming}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
            >
              {isRedeeming ? "កំពុងដំណើរការ..." : "បញ្ជាក់ការប្រគល់ ✓"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold">
              បន្ថែមត្រាដោយផ្ទាល់ដៃ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              តើអ្នកពិតជាចង់បន្ថែមត្រាដោយផ្ទាល់ដៃសម្រាប់{" "}
              <span className="font-bold text-primary">
                {selectedUserForStamp?.username}
              </span>
              មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ
              ហើយវានឹងបន្ថែមវឌ្ឍនភាពទៅកាតសន្សំតែមរបស់ពួកគេ។
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">
              បោះបង់
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleManualAddConfirm();
              }}
              disabled={isAdding}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
            >
              {isAdding ? "កំពុងដំណើរការ..." : "បញ្ជាក់"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold">
              បោះបង់ការបន្ថែមត្រា
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              តើអ្នកពិតជាចង់បញ្ចៀសការបន្ថែមត្រានេះមែនទេ?
              វានឹងលុបពីប្រវត្តិអតិថិជន និងរៀបចំបែបរន្ធនេះឲ្យនៅទទេវិញ។
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">
              ថយក្រោយ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (stampToDelete) handleDeleteStamp(stampToDelete);
              }}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              {isDeleting ? "កំពុងលុប..." : "បញ្ជាក់ការលុប"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── QR Code Modal ── */}
      {isQrModalOpen && qrScanUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseQr}
          />

          {/* Modal card — scrollable on small screens */}
          <div className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95dvh] flex flex-col gap-4">
            {/* Close */}
            <button
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors"
              onClick={handleCloseQr}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center pt-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <QrCode className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-black text-zinc-100">
                  QR ត្រា · បោះពុម្ព
                </h2>
              </div>
              <p className="text-zinc-500 text-xs">
                ទាញយករូបភាព ហើយបោះពុម្ព ឬបង្ហោះ
              </p>
            </div>

            {/* ── Poster preview — scaled to fit the modal ── */}
            <div className="flex justify-center">
              <div
                style={{
                  transform: "scale(0.72)",
                  transformOrigin: "top center",
                  width: "360px",
                  height: "460px",
                  flexShrink: 0,
                }}
              >
                <div
                  id="qr-poster-download"
                  style={{
                    width: "360px",
                    minHeight: "460px",
                    background: "#f5f0e8",
                    borderRadius: "16px",
                    padding: "28px 28px 22px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontFamily: "'Kantumruy Pro', 'Segoe UI', sans-serif",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Sparkle TL */}
                  <svg
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 16,
                      opacity: 0.5,
                    }}
                    width="30"
                    height="30"
                    viewBox="0 0 30 30"
                    fill="none"
                  >
                    <path d="M15 3L16.2 13L15 23L13.8 13Z" fill="#8B5E3C" />
                    <path d="M3 15L13 16.2L23 15L13 13.8Z" fill="#8B5E3C" />
                  </svg>
                  {/* Sparkle TR */}
                  <svg
                    style={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      opacity: 0.4,
                    }}
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                  >
                    <path d="M11 1L12 9L11 17L10 9Z" fill="#6b3d1e" />
                    <path d="M1 11L9 12L17 11L9 10Z" fill="#6b3d1e" />
                  </svg>
                  {/* Sparkle BR */}
                  <svg
                    style={{
                      position: "absolute",
                      bottom: 50,
                      right: 16,
                      opacity: 0.3,
                    }}
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                  >
                    <path d="M9 1L9.8 7L9 13L8.2 7Z" fill="#8B5E3C" />
                    <path d="M1 9L7 9.8L13 9L7 8.2Z" fill="#8B5E3C" />
                  </svg>

                  {/* Brand */}
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: "#8B5E3C",
                      marginBottom: "4px",
                    }}
                  >
                    23 COFFEE
                  </div>

                  {/* Headline */}
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: 900,
                      color: "#2c1a0e",
                      lineHeight: 1.05,
                      textAlign: "center",
                      marginBottom: "6px",
                    }}
                  >
                    Scan To
                    <br />
                    Stamp
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#7a5c44",
                      textAlign: "center",
                      marginBottom: "18px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {"ស្កែន QR ដើម្បីសន្សំត្រា & ទទួលកាហ្វេឥតគិតថ្លៃ ☕"}
                  </div>

                  {/* QR box */}
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "16px",
                      padding: "14px 14px 10px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.2em",
                        color: "#c9803a",
                        textTransform: "uppercase",
                      }}
                    >
                      {"— SCAN ME —"}
                    </div>
                    {/* QR with centered logo overlay */}
                    <div
                      style={{
                        position: "relative",
                        width: "200px",
                        height: "200px",
                        flexShrink: 0,
                      }}
                    >
                      <QRCode
                        id="qr-code-svg"
                        value={qrScanUrl}
                        size={200}
                        fgColor="#1a0f00"
                        level="H"
                      />
                      {/* White square pad behind logo so it blends cleanly */}
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          background: "#ffffff",
                          padding: "1px",
                          lineHeight: 0,
                        }}
                      >
                        <img
                          src="/23_coffee.png"
                          alt="23 Coffee"
                          style={{
                            width: "64px",
                            height: "64px",
                            objectFit: "contain",
                            display: "block",
                            overflow: "hidden",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.2em",
                        color: "#c9803a",
                        textTransform: "uppercase",
                      }}
                    >
                      {"— SCAN ME —"}
                    </div>
                  </div>

                  {/* Stamp count */}
                  <div
                    style={{
                      marginTop: "14px",
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#7a5c44",
                      fontWeight: 600,
                    }}
                  >
                    {"ប្រមូល "}
                    <span style={{ color: "#c9803a", fontWeight: 900 }}>
                      {STAMPS_PER_CYCLE} {"ត្រា"}
                    </span>
                    {" = ☕ ១ កែវឥតគិតថ្លៃ"}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid #d4c4b0",
                      width: "100%",
                      textAlign: "center",
                      fontSize: "10px",
                      color: "#a08060",
                      letterSpacing: "0.05em",
                    }}
                  >
                    23 Coffee · Loyalty Stamp Program
                  </div>
                </div>
              </div>
            </div>

            {/* Download button */}
            <Button
              onClick={handleDownloadQr}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2 h-11 rounded-xl shadow-lg shadow-amber-900/20 shrink-0"
            >
              <QrCode className="h-4 w-4" />
              ទាញយក PNG (Print Ready)
            </Button>
            <p className="text-center text-zinc-600 text-[10px] -mt-2">
              QR អចិន្ត្រៃយ៍ · ១ ត្រា / ម៉ោង / អតិថិជន
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
