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
  const displayCount =
    approvedStamps.length > 0 && approvedStamps.length % STAMPS_PER_CYCLE === 0
      ? STAMPS_PER_CYCLE
      : approvedStamps.length % STAMPS_PER_CYCLE;

  const isFull =
    approvedStamps.length > 0 && approvedStamps.length % STAMPS_PER_CYCLE === 0;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-1 w-full translate-y-[-20px]">
      <div
        className={cn(
          "relative w-full max-w-[420px] aspect-[1.6/1] bg-[#3c3532] rounded-[1.5rem] shadow-2xl overflow-hidden border border-black/20 transition-all duration-500 flex flex-col justify-between",
          isFull && "ring-4 ring-[#dcd3c1]/30",
        )}
      >
        {/* Coffee Bean Pattern Background */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="bean-mask">
                <rect x="-20" y="-20" width="40" height="40" fill="white" />
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
                {/* Randomize bean rotations, mirroring standard scattered coffee beans */}
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
            <rect width="100%" height="100%" fill="url(#beans-pattern)" />
          </svg>
        </div>

        {/* Card Content */}
        <div className="relative h-full p-4 min-[420px]:p-5 flex flex-col justify-between z-10">
          {/* Header Row */}
          <div className="flex justify-between items-start pt-1 mb-2 min-[420px]:mb-4">
            {/* Name Box */}
            <div className="bg-[#dcd3c1] w-[50vw] max-w-[220px] h-[32px] min-[420px]:h-[38px] rounded-lg px-2 min-[420px]:px-3 flex flex-col justify-center relative shadow-inner">
              <span className="text-[#3c3532] text-[7px] font-bold uppercase tracking-widest leading-none mb-0.5">
                Name
              </span>
              <span className="text-[#3c3532] text-sm font-black uppercase truncate leading-none">
                {user.username}
              </span>
            </div>

            {/* Logo/Steam section */}
            <div className="flex flex-col items-center pr-1 translate-y-[-5px]">
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

          {/* Stamp Grid (3 per row) */}
          <div className="flex flex-col gap-3 min-[420px]:gap-5 px-1 pb-2 min-[420px]:pb-4">
            <div className="flex justify-between items-center px-1 min-[420px]:px-4">
              {[0, 1, 2].map((i) => {
                const isFilled = i < displayCount;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-[13vw] max-w-[55px] aspect-square rounded-full border-[1.5px] border-[#dcd3c1] flex items-center justify-center relative",
                      isFilled ? "bg-[#dcd3c1]" : "bg-transparent",
                    )}
                  >
                    {isFilled ? (
                      <img
                        src="/23_coffee.png"
                        className="w-full h-full object-contain p-0 drop-shadow-md scale-[1.35]"
                        alt="Stamp"
                      />
                    ) : (
                      <span className="text-[#dcd3c1]/40 text-xs font-black">
                        {i + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center px-1 min-[420px]:px-4">
              {[3, 4, 5].map((i) => {
                const isFilled = i < displayCount;
                const isLast = i === 5;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-[13vw] max-w-[55px] aspect-square rounded-full border-[1.5px] border-[#dcd3c1] flex items-center justify-center relative",
                      isFilled
                        ? isLast
                          ? "bg-[#dcd3c1]"
                          : "bg-[#dcd3c1]/20"
                        : isLast
                          ? "bg-[#dcd3c1]"
                          : "bg-transparent",
                    )}
                  >
                    {isFilled ? (
                      <img
                        src="/23_coffee.png"
                        className={cn(
                          "w-full h-full object-contain p-0 drop-shadow-md scale-[1.35]",
                          isLast && "brightness-50",
                        )}
                        alt="Stamp"
                      />
                    ) : isLast ? (
                      <span className="text-[#3c3532] text-[10px] font-black uppercase tracking-tight">
                        Free
                      </span>
                    ) : (
                      <span className="text-[#dcd3c1]/60 text-xs font-black">
                        {i + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Text */}
          <div className="text-center px-2 min-[420px]:px-4 pb-1">
            <p className="text-[#dcd3c1]/60 text-[8px] min-[420px]:text-[10px] leading-[1.2] uppercase tracking-[0.05em] line-clamp-2 italic drop-shadow-sm">
              ប្រមូលត្រាឱ្យបាន {STAMPS_PER_CYCLE} ដើម្បីទទួលបានកាហ្វេ ១
              កែវឥតគិតថ្លៃ។
            </p>
          </div>
        </div>

        {/* Status indicator overlay for 6/6 */}
        {isFull && (
          <div className="absolute top-2 right-2 rotate-12 z-20">
            <Badge className="bg-[#dcd3c1] text-[#3c3532] border-none font-black text-[10px] shadow-lg animate-bounce px-3">
              READY! ☕️
            </Badge>
          </div>
        )}
      </div>

      {/* Stats beneath card */}
      <div className="mt-8 flex flex-col items-center gap-4 w-full animate-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center gap-8 bg-[#3c3532]/30 px-6 py-3 rounded-2xl border border-[#dcd3c1]/10">
          <div className="flex flex-col items-center">
            <span className="text-[#dcd3c1]/50 text-[9px] uppercase font-bold tracking-widest">
              Total Earned
            </span>
            <span className="text-lg font-black text-[#dcd3c1]">
              {approvedStamps.length}
            </span>
          </div>
          <div className="w-px h-8 bg-[#dcd3c1]/10" />
          <div className="flex flex-col items-center">
            <span className="text-[#dcd3c1]/50 text-[9px] uppercase font-bold tracking-widest">
              Rewards Given
            </span>
            <span className="text-lg font-black text-[#dcd3c1] drop-shadow-[0_0_8px_rgba(220,211,193,0.3)]">
              {Math.floor(approvedStamps.length / STAMPS_PER_CYCLE)}
            </span>
          </div>
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
  const result = await res.json();
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

export default function StampsPage() {
  const { data: currentUser } = useSWR("/api/auth/me", meFetcher);
  const { data, isLoading, error, mutate } = useSWR("/api/scan", fetcher);
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
    : 6;

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>(
    {},
  );
  const [mounted, setMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserForStamp, setSelectedUserForStamp] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [stampToDelete, setStampToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleManualAddClick = (userId: number, username: string) => {
    setSelectedUserForStamp({ id: userId, username });
    setIsDialogOpen(true);
  };

  const handleManualAddConfirm = useCallback(async () => {
    if (isAdding || !selectedUserForStamp) return;

    setIsAdding(true);
    try {
      const res = await rpc.scan.$post({
        json: { userId: selectedUserForStamp.id },
      });

      const result = await res.json();
      if (res.ok && result.success === true) {
        toast.success(`Stamp added for ${selectedUserForStamp.username}`);
        mutate(); // Refresh the list
      } else {
        const errorMsg =
          result.success === false ? result.message : "Failed to add stamp";
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while adding the stamp");
    } finally {
      setIsAdding(false);
      setIsDialogOpen(false);
      setSelectedUserForStamp(null);
    }
  }, [isAdding, mutate, selectedUserForStamp]);

  const handleDeleteStamp = useCallback(
    async (id: number) => {
      if (isDeleting) return;

      setIsDeleting(true);
      try {
        const res = await rpc.scan[":id"].$delete({
          param: { id: id.toString() },
        });

        const result = await res.json();
        if (res.ok && result.success === true) {
          toast.success("Stamp deleted successfully");
          mutate(); // Refresh the list
        } else {
          const errorMsg =
            result.success === false
              ? result.message
              : "Failed to delete stamp";
          toast.error(errorMsg);
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while deleting the stamp");
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

  if (error || usersError || settingsError)
    return (
      <div className="p-6 text-destructive">
        Error: {error?.message || usersError?.message || settingsError?.message}
      </div>
    );
  if (isLoading || isUsersLoading || isSettingsLoading)
    return <LoadingScreen message="Fetching stamp history..." />;
  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-20">
      {currentUser?.role === "admin" && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-primary">Customer Stamps</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Track customer progress. {STAMPS_PER_CYCLE} stamps = 1 free
              coffee.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search customers..."
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
              No customers found matching your criteria.
            </p>
          </div>
        ) : currentUser?.role === "admin" ? (
          groupedData.map((group, index) => {
            const userId = group.user?.id || 0;
            const isExpanded = expandedUsers[userId];
            const totalStamps = group.stamps.length;
            const currentCycleCount = totalStamps % STAMPS_PER_CYCLE;
            const completedCycles = Math.floor(totalStamps / STAMPS_PER_CYCLE);

            return (
              <Collapsible
                key={userId}
                open={isExpanded}
                onOpenChange={(open) => onOpenChange(userId, open)}
                className="w-full"
              >
                <Card className="bg-zinc-900 gap-0 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors p-0!">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer select-none py-3 px-4 flex flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-primary font-bold hidden sm:inline">
                          {index + 1}.
                        </span>
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold text-zinc-100 truncate">
                            {group.user?.username || "Guest User"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <Clock className="h-2.5 w-2.5" />
                              {group.user?.timestamp
                                ? formatDate(group.user.timestamp)
                                : "Long ago"}
                            </span>
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            {completedCycles > 0 && (
                              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold text-[10px] h-5 py-0 px-1.5">
                                <Gift className="h-2.5 w-2.5 mr-1" />
                                <span className="hidden xs:inline">
                                  {completedCycles}{" "}
                                  {completedCycles > 1 ? "Coffees" : "Coffee"}
                                </span>
                                <span className="xs:hidden">
                                  {completedCycles}
                                </span>
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-zinc-950/50 border-zinc-800 text-zinc-500 text-[10px] h-5 py-0 px-1.5 whitespace-nowrap"
                            >
                              Total: {totalStamps}
                            </Badge>
                          </div>
                          <div className="w-20 sm:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{
                                width: `${(currentCycleCount / STAMPS_PER_CYCLE) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">
                            {currentCycleCount}/{STAMPS_PER_CYCLE}{" "}
                            <span className="hidden xs:inline">next</span>
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
                      {/* Group stamps into cycles of STAMPS_PER_CYCLE */}
                      {Array.from({
                        length: Math.max(
                          1,
                          Math.ceil((totalStamps + 1) / STAMPS_PER_CYCLE),
                        ),
                      })
                        .reverse()
                        .map((_, cycleIndex, arr) => {
                          const actualCycleIndex = arr.length - 1 - cycleIndex;
                          const cycleStamps = [...group.stamps]
                            .reverse()
                            .slice(
                              actualCycleIndex * STAMPS_PER_CYCLE,
                              (actualCycleIndex + 1) * STAMPS_PER_CYCLE,
                            );
                          const isCycleComplete =
                            cycleStamps.length === STAMPS_PER_CYCLE;

                          return (
                            <div key={actualCycleIndex} className="relative">
                              <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">
                                  Cycle #{actualCycleIndex + 1}
                                </h4>
                                {isCycleComplete && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Reward Earned
                                  </div>
                                )}
                                <div className="flex-1 h-px bg-zinc-800" />
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                {/* Show STAMPS_PER_CYCLE slots per cycle */}
                                {Array.from({ length: STAMPS_PER_CYCLE }).map(
                                  (_, slotIndex) => {
                                    const stamp = cycleStamps[slotIndex];

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
                                        {slotIndex === STAMPS_PER_CYCLE - 1 && (
                                          <div
                                            className={cn(
                                              "absolute top-4 right-4 transition-all duration-300 flex items-center gap-2 z-10",
                                              stamp
                                                ? "text-emerald-500 fill-emerald-500/20 animate-bounce"
                                                : "text-zinc-800",
                                            )}
                                          >
                                            <Badge>Free</Badge>
                                          </div>
                                        )}
                                        {stamp ? (
                                          <>
                                            {stamp.status === "approved" ? (
                                              <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500 p-0">
                                                <img
                                                  src="/23_coffee.png"
                                                  alt="Stamp"
                                                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] -rotate-12 group-hover:rotate-0 transition-transform duration-500 scale-[1.25]"
                                                />
                                              </div>
                                            ) : (
                                              <Badge
                                                className={cn(
                                                  "capitalize",
                                                  stamp.status === "pending" &&
                                                    "bg-yellow-500 text-black",
                                                  stamp.status === "rejected" &&
                                                    "bg-red-500 text-white",
                                                )}
                                              >
                                                {stamp.status}
                                              </Badge>
                                            )}
                                            {currentUser?.role === "admin" && (
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
                                                  ? formatDate(stamp.timestamp)
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
                                              Locked
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
        )}
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold">
              Manual Stamp Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to manually add a stamp for{" "}
              <span className="font-bold text-primary">
                {selectedUserForStamp?.username}
              </span>
              ? This action cannot be undone and will add progress to their
              coupon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleManualAddConfirm();
              }}
              disabled={isAdding}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
            >
              {isAdding ? "Loading..." : "Confirm"}
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
              Cancel Stamp
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to cancel this stamp? This will remove it
              from the customer's history and reset this slot to empty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (stampToDelete) handleDeleteStamp(stampToDelete);
              }}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              {isDeleting ? "Deleting..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
