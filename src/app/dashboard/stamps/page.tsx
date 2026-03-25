"use client";

import useSWR from "swr";
import { rpc } from "@/lib/rpc";
import { type ApiScanWithUser, type ApiScan, type ApiUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, User as UserIcon, Search, Filter, ChevronDown, ChevronRight, Gift, CheckCircle2, Coffee } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const fetcher = async (): Promise<ApiScanWithUser[]> => {
  const res = await rpc.scan.$get();
  if (!res.ok) throw new Error("Failed to fetch scans");
  const result = await res.json();
  return result.data;
};

const meFetcher = async () => {
  const res = await rpc.auth.me.$get();
  if (!res.ok) return null;
  const result = await res.json();
  return result.success ? result.user : null;
};

const STAMPS_PER_CYCLE = 6;

type GroupedScan = {
  user: ApiUser | null;
  scans: ApiScan[];
};

export default function ScansPage() {

  const { data, isLoading, error, mutate } = useSWR("/api/scan", fetcher);
  const { data: currentUser } = useSWR("/api/auth/me", meFetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserForScan, setSelectedUserForScan] = useState<{ id: number, username: string } | null>(null);

  const handleManualAddClick = (userId: number, username: string) => {
    setSelectedUserForScan({ id: userId, username });
    setIsDialogOpen(true);
  };

  const handleManualAddConfirm = useCallback(async () => {
    if (isAdding || !selectedUserForScan) return;

    setIsAdding(true);
    try {
      const res = await rpc.scan.$post({
        json: { userId: selectedUserForScan.id }
      });

      const result = await res.json();
      if (res.ok && result.success === true) {
        toast.success(`Stamp added for ${selectedUserForScan.username}`);
        mutate(); // Refresh the list
      } else {
        const errorMsg = result.success === false ? result.message : "Failed to add stamp";
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while adding the stamp");
    } finally {
      setIsAdding(false);
      setIsDialogOpen(false);
      setSelectedUserForScan(null);
    }
  }, [isAdding, mutate, selectedUserForScan]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onOpenChange = (userId: number, open: boolean) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: open }));
  };

  const groupedData = useMemo(() => {
    if (!data) return [];

    // Group by user
    const groups: Record<number, GroupedScan> = {};

    data.forEach((item) => {
      const userId = item.scan_history.user_id || 0;
      if (!groups[userId]) {
        groups[userId] = {
          user: item.user,
          scans: [],
        };
      }
      groups[userId].scans.push(item.scan_history);
    });

    // Sort scans by timestamp descending (within each user)
    Object.values(groups).forEach(group => {
      group.scans.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });
    });

    // Filter by search and status
    return Object.values(groups).filter((group) => {
      const username = group.user?.username || "Unknown";
      const matchesSearch =
        !searchTerm ||
        username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.scans.some(s => s.status.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        selectedStatus === "all" || group.scans.some(s => s.status === selectedStatus);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, selectedStatus]);

  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;
  if (isLoading) return <LoadingScreen message="Fetching stamp history..." />;
  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Customer Stamps</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track customer progress. {STAMPS_PER_CYCLE} stamps = 1 free coffee.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search customers..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5 pr-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500 ml-1" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-7 border-none bg-transparent p-1 focus:ring-0 text-xs font-medium text-zinc-200 min-w-[100px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-2 mt-5">
        {groupedData.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
            <UserIcon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No customers found matching your criteria.</p>
          </div>
        ) : (
          groupedData.map((group, index) => {
            const userId = group.user?.id || 0;
            const isExpanded = expandedUsers[userId];
            const totalScans = group.scans.length;
            const currentCycleCount = totalScans % STAMPS_PER_CYCLE;
            const completedCycles = Math.floor(totalScans / STAMPS_PER_CYCLE);

            return (
              <Collapsible
                key={userId}
                open={isExpanded}
                onOpenChange={(open) => onOpenChange(userId, open)}
                className="w-full"
              >
                <Card className="bg-zinc-900 gap-0 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors p-0!">
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className="cursor-pointer select-none py-2 px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 grid-rows-none auto-rows-auto"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold">{index + 1}.</span>
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold text-zinc-100 truncate">{group.user?.username || "Guest User"}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <Clock className="h-2.5 w-2.5" />
                              {group.user?.timestamp ? formatDate(group.user.timestamp) : "Long ago"}
                            </span>
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex flex-col items-end gap-1 flex-1 sm:flex-none">
                          <div className="flex items-center gap-2">
                            {completedCycles > 0 && (
                              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold text-[10px] h-5 py-0 px-1.5">
                                <Gift className="h-2.5 w-2.5 mr-1" />
                                {completedCycles} {completedCycles > 1 ? 'Coffees' : 'Coffee'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="bg-zinc-950/50 border-zinc-800 text-zinc-500 text-[10px] h-5 py-0 px-1.5 whitespace-nowrap">
                              Total: {totalScans}
                            </Badge>
                          </div>
                          <div className="w-full sm:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${(currentCycleCount / STAMPS_PER_CYCLE) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">
                            Progress: {currentCycleCount}/{STAMPS_PER_CYCLE} next
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 shrink-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-zinc-800/50 bg-black/10 p-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    <div className="space-y-4">
                      {/* Group scans into cycles of STAMPS_PER_CYCLE */}
                      {Array.from({ length: Math.max(1, Math.ceil((totalScans + 1) / STAMPS_PER_CYCLE)) }).reverse().map((_, cycleIndex, arr) => {
                        const actualCycleIndex = arr.length - 1 - cycleIndex;
                        const cycleScans = [...group.scans].reverse().slice(actualCycleIndex * STAMPS_PER_CYCLE, (actualCycleIndex + 1) * STAMPS_PER_CYCLE);
                        const isCycleComplete = cycleScans.length === STAMPS_PER_CYCLE;

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
                              {Array.from({ length: STAMPS_PER_CYCLE }).map((_, slotIndex) => {
                                const scan = cycleScans[slotIndex];

                                return (
                                  <div
                                    key={slotIndex}
                                    onClick={!scan && currentUser?.role === 'admin' ? () => handleManualAddClick(userId, group.user?.username || "Guest") : undefined}
                                    className={cn(
                                      "aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all p-2 relative group",
                                      scan
                                        ? "bg-zinc-800/50 border-zinc-700 shadow-lg shadow-black/20"
                                        : "bg-transparent border-dashed border-zinc-800",
                                      !scan && currentUser?.role === 'admin' && "cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                                    )}
                                  >
                                    {slotIndex === STAMPS_PER_CYCLE - 1 && (
                                      <div className={cn(
                                        "absolute top-4 right-4 transition-all duration-300 flex items-center gap-2",
                                        scan ? "text-emerald-500 fill-emerald-500/20 animate-bounce" : "text-zinc-800"
                                      )}>
                                        <Badge>Free</Badge>
                                      </div>
                                    )}
                                    {scan ? (
                                      <>
                                        <Badge
                                          className={cn(
                                            "capitalize",
                                            scan.status === 'approved' && "bg-emerald-500 text-white",
                                            scan.status === 'pending' && "bg-yellow-500 text-black",
                                            scan.status === 'rejected' && "bg-red-500 text-white"
                                          )}
                                        >
                                          {scan.status}
                                        </Badge>
                                        <span className="text-zinc-400 text-center leading-tight text-sm mt-1">
                                          {scan.timestamp ? formatDate(scan.timestamp) : "-"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="h-6 w-6 rounded-full border border-zinc-800 flex items-center justify-center">
                                          <span className="text-xs text-zinc-700 font-bold">{slotIndex + 1}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-800 font-medium">Locked</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
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
        )}
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold">Manual Stamp Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to manually add a stamp for <span className="font-bold text-primary">{selectedUserForScan?.username}</span>?
              This action cannot be undone and will add progress to their coupon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100">Cancel</AlertDialogCancel>
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

    </div>
  );
}
