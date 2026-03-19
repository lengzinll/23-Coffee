"use client";

import useSWR, { useSWRConfig } from "swr";
import { rpc } from "@/lib/rpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Image as ImageIcon,
  ExternalLink,
  Youtube,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Pagination options
const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];
import {
  type RegistrationWithEvent,
  type ApiEventWithCounts,
  type ApiSocialMediaTask,
} from "@/lib/types";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

const fetcher = async () => {
  const res = await rpc.register.$get();
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return data.data;
};

export default function ScoreTable({
  showLive = false,
}: {
  showLive?: boolean;
}) {
  const { data, isLoading } = useSWR("/api/register", fetcher);
  const { data: activeEvent, isLoading: isLoadingActiveEvent } = useSWR(
    "/api/event/active",
    async () => {
      const res = await rpc.event.active.$get();
      if (!res.ok) return null;
      return (await res.json()).data;
    },
  );
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [registrationToDelete, setRegistrationToDelete] =
    useState<RegistrationWithEvent | null>(null);

  const handleDelete = (reg: RegistrationWithEvent) => {
    setRegistrationToDelete(reg);
  };

  const [isVerifying, setIsVerifying] = useState<number | null>(null);

  const handleToggleLive = async (id: number) => {
    try {
      const res = await rpc.register[":id"].live.$patch({
        param: { id: id.toString() },
      });
      if (res.ok) {
        toast.success("Live player updated successfully");
        mutate("/api/register");
      } else {
        toast.error("Failed to update live player");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const handleVerify = async (id: number) => {
    setIsVerifying(id);
    try {
      const res = await rpc.register[":id"].scan.$patch({
        param: { id: id.toString() },
      });
      if (res.ok) {
        toast.success("Registration verified manually");
        mutate("/api/register");
        mutate("events:list:metrics");
      } else {
        const errorData = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(errorData.message || "Failed to verify");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while verifying");
    } finally {
      setIsVerifying(null);
    }
  };

  const confirmDelete = async () => {
    if (!registrationToDelete) return;
    const id = registrationToDelete.id;
    setIsDeleting(id);
    try {
      const res = await rpc.register[":id"].$delete({
        param: { id: id.toString() },
      });
      if (res.ok) {
        toast.success("Registration deleted");
        mutate("/api/register");
        setRegistrationToDelete(null);
      } else {
        const errorData = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        toast.error(errorData.message || errorData.error || "Failed to delete");
        setRegistrationToDelete(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting");
      setRegistrationToDelete(null);
    } finally {
      setIsDeleting(null);
    }
  };

  const [viewingProofs, setViewingProofs] =
    useState<RegistrationWithEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, pageSize]);

  const filteredData = useMemo(() => {
    if (!data) return [];

    // Filter by active event only
    let result = data
      .map((r: any) => ({
        ...r,
        isLive: r.isLive ?? false,
      }))
      .filter((reg: RegistrationWithEvent) => {
        // If we have an active event, only show its registrations
        if (activeEvent && reg.eventId !== activeEvent.id) {
          return false;
        }

        const matchesSearch =
          !searchTerm ||
          reg.id.toString().includes(searchTerm.toLowerCase()) ||
          (reg.playerId || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          reg.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (reg.eventName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          reg.age.toString().includes(searchTerm.toLowerCase()) ||
          reg.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (reg.scanned ? "verified" : "pending").includes(
            searchTerm.toLowerCase(),
          );

        const matchesStatus =
          selectedStatus === "all" ||
          (selectedStatus === "verified" ? reg.scanned : !reg.scanned);

        return matchesSearch && matchesStatus;
      });

    // Sort by score descending
    return [...result].sort(
      (a, b) => (b.totalScore || 0) - (a.totalScore || 0),
    );
  }, [data, searchTerm, selectedStatus, activeEvent]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const parseProofs = (proofsString: string | null): Record<string, string> => {
    if (!proofsString) return {};
    try {
      return JSON.parse(proofsString) as Record<string, string>;
    } catch (e) {
      return {};
    }
  };

  if (isLoading) return <LoadingScreen message="Fetching registrations..." />;
  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Score Table</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {activeEvent
              ? `Leaderboard for ${activeEvent.name}`
              : "Score table for the active event"}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by name, phone, or status..."
            className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-primary/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="text-lg">
              {activeEvent
                ? `${activeEvent.name} Leaderboard`
                : "Active Event Participants"}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Showing top scorers and participants.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeEvent && (
              <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-3">
                Currently Active: {activeEvent.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800 text-sm max-h-[500px] overflow-auto relative">
            <Table>
              <TableHeader className="bg-zinc-800/50 sticky top-0 z-10">
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  {showLive && (
                    <TableHead className="text-zinc-300 w-[60px]">
                      Live
                    </TableHead>
                  )}
                  <TableHead className="text-zinc-300">Player ID</TableHead>
                  <TableHead className="text-zinc-300 w-[56px]">
                    Photo
                  </TableHead>
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Position</TableHead>
                  <TableHead className="text-zinc-300">Event</TableHead>
                  <TableHead className="text-zinc-300">Age</TableHead>
                  <TableHead className="text-zinc-300">Contact</TableHead>
                  <TableHead className="text-zinc-300 text-center">
                    Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map(
                  (reg: RegistrationWithEvent, index: number) => {
                    const overallIndex = (currentPage - 1) * pageSize + index;
                    const isTop7 = overallIndex < 7;

                    return (
                      <TableRow
                        key={reg.id}
                        className={cn(
                          "border-zinc-800 hover:bg-zinc-800/50 transition-colors",
                          reg.isLive && "bg-primary/5",
                          isTop7 && "border-l-2 border-l-primary",
                        )}
                      >
                        {showLive && (
                          <TableCell>
                            <input
                              type="radio"
                              checked={!!reg.isLive}
                              onChange={() => handleToggleLive(reg.id)}
                              className="w-4 h-4 accent-primary cursor-pointer"
                              title="Set as Live Player"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-bold text-primary">
                          <div className="flex items-center gap-2">
                            {isTop7 && (
                              <Badge className="h-5 min-w-5 flex items-center justify-center p-0 bg-primary/20 text-primary border-primary/30 text-[10px]">
                                {overallIndex + 1}
                              </Badge>
                            )}
                            {reg.playerId || `Legacy-${reg.id}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                            {(reg as any).profileImage ? (
                              <img
                                src={(reg as any).profileImage}
                                alt={reg.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-zinc-500 text-xs font-bold">
                                {reg.fullName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              isTop7 && "font-semibold text-zinc-100",
                            )}
                          >
                            {reg.fullName}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize text-zinc-400 font-medium">
                          {reg.position || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-primary border-primary/20 px-2 py-1 bg-primary/5"
                          >
                            {reg.eventName || "No Event"}
                          </Badge>
                        </TableCell>
                        <TableCell>{reg.age}</TableCell>
                        <TableCell>{reg.phone}</TableCell>
                        <TableCell
                          className={cn(
                            "font-bold text-center",
                            isTop7 ? "text-primary text-lg" : "text-primary/70",
                          )}
                        >
                          {reg.totalScore ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-zinc-500"
                    >
                      {isLoading
                        ? "Loading registrations..."
                        : "No registrations found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 border-t border-zinc-800 mt-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-zinc-500">
              <div>
                Showing{" "}
                <span className="text-zinc-300 font-medium">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="text-zinc-300 font-medium">
                  {Math.min(currentPage * pageSize, filteredData.length)}
                </span>{" "}
                of{" "}
                <span className="text-zinc-300 font-medium">
                  {filteredData.length}
                </span>{" "}
                results
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => setPageSize(parseInt(val))}
                >
                  <SelectTrigger className="h-7 w-[70px] border-zinc-800 bg-zinc-900 focus:ring-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1 mx-2">
                <span className="text-xs text-zinc-300 font-medium">
                  {currentPage}
                </span>
                <span className="text-xs text-zinc-500">/</span>
                <span className="text-xs text-zinc-500">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!viewingProofs}
        onOpenChange={() => setViewingProofs(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-[95vw] lg:max-w-7xl overflow-hidden p-0 h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex justify-between items-center mr-4">
              <span>Verification Proofs</span>
              <span className="text-sm font-normal text-zinc-500">
                #{viewingProofs?.id} {viewingProofs?.fullName}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
              {viewingProofs &&
                Object.entries(parseProofs(viewingProofs.socialProofs)).map(
                  ([taskId, url]: [string, string]) => (
                    <div
                      key={taskId}
                      className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-full"
                    >
                      <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center text-xs shrink-0">
                        <div className="flex items-center gap-2">
                          {taskId.includes("youtube") ||
                          viewingProofs?.socialMediaTasks?.find(
                            (t: ApiSocialMediaTask) =>
                              t.id.toString() === taskId,
                          )?.type === "youtube" ? (
                            <Youtube className="w-3.5 h-3.5 text-primary" />
                          ) : null}
                          <span className="font-medium text-zinc-400 uppercase tracking-widest">
                            Task #{taskId}
                          </span>
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary flex items-center gap-1"
                        >
                          Full Size <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="p-4 flex-1 flex items-center justify-center bg-black/20 min-h-0">
                        <img
                          src={url}
                          alt={`Proof for task ${taskId}`}
                          className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                        />
                      </div>
                    </div>
                  ),
                )}

              {/* Dynamic Proofs only */}
            </div>
          </div>

          <div className="p-6 pt-4 mt-auto border-t border-zinc-800 flex justify-end shrink-0 bg-zinc-900 z-10">
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 bg-zinc-900 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={() => setViewingProofs(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={!!registrationToDelete}
        onClose={() => setRegistrationToDelete(null)}
        onConfirm={confirmDelete}
        confirmText="Yes, Delete Registration"
        description={
          <p>
            Are you sure you want to delete the registration for{" "}
            <span className="text-zinc-100 font-semibold">
              "{registrationToDelete?.fullName}"
            </span>
            ? All associated screenshots will be permanently deleted from Vercel
            Blob.
          </p>
        }
        isLoading={isDeleting === registrationToDelete?.id}
      />
    </div>
  );
}
