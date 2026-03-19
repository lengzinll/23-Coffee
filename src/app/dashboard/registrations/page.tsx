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
import { ScoreModal } from "./_components/score-modal";

const fetcher = async () => {
  const res = await rpc.register.$get();
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return data.data;
};

export default function RegistrationsPage() {
  const { data, isLoading } = useSWR("/api/register", fetcher);
  const { data: events } = useSWR("/api/event", async () => {
    const res = await rpc.event.$get();
    return (await res.json()).data;
  });
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [registrationToDelete, setRegistrationToDelete] =
    useState<RegistrationWithEvent | null>(null);

  const handleDelete = (reg: RegistrationWithEvent) => {
    setRegistrationToDelete(reg);
  };

  const [registrationToVerify, setRegistrationToVerify] =
    useState<RegistrationWithEvent | null>(null);
  const [isVerifying, setIsVerifying] = useState<number | null>(null);

  const handleVerifyClick = (reg: RegistrationWithEvent) => {
    setRegistrationToVerify(reg);
  };

  const handleVerify = async () => {
    if (!registrationToVerify) return;
    const id = registrationToVerify.id;
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
      setRegistrationToVerify(null);
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
  const [scoringRegistration, setScoringRegistration] =
    useState<RegistrationWithEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
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
  }, [searchTerm, selectedEventId, selectedStatus, pageSize]);

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((reg: RegistrationWithEvent) => {
      const matchesSearch =
        !searchTerm ||
        reg.id.toString().includes(searchTerm.toLowerCase()) ||
        (reg.playerId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.eventName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        reg.age.toString().includes(searchTerm.toLowerCase()) ||
        reg.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.scanned ? "verified" : "pending").includes(
          searchTerm.toLowerCase(),
        );

      const matchesEvent =
        selectedEventId === "all" ||
        reg.eventId?.toString() === selectedEventId;

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "verified" ? reg.scanned : !reg.scanned);

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [data, searchTerm, selectedEventId, selectedStatus]);

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

  if (isLoading) return <LoadingScreen message="Fetching registrations..." />;
  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Registrations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and verify all event participants.
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
            <CardTitle className="text-lg">All Participants</CardTitle>
            <CardDescription className="text-zinc-400">
              Showing {filteredData.length} of {data?.length || 0}{" "}
              registrations.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5 pr-2">
              <div className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800">
                <Filter className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex flex-col h-full justify-center min-w-[180px]">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider leading-none mb-1 ml-1">
                  Event
                </span>
                <Select
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                >
                  <SelectTrigger className="h-6 border-none bg-transparent p-1 focus:ring-0 text-xs font-medium text-zinc-200">
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="all">All Live Events</SelectItem>
                    {events?.map((event: ApiEventWithCounts) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5 pr-2">
              <div className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex flex-col h-full justify-center min-w-[120px]">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider leading-none mb-1 ml-1">
                  Status
                </span>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="h-6 border-none bg-transparent p-1 focus:ring-0 text-xs font-medium text-zinc-200">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800 text-sm max-h-[500px] overflow-auto relative">
            <Table>
              <TableHeader className="bg-zinc-800/50 sticky top-0 z-10">
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-300 w-[60px]">Live</TableHead>
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
                    Tasks
                  </TableHead>
                  <TableHead className="text-zinc-300 text-center">
                    Scan Status
                  </TableHead>
                  <TableHead className="text-zinc-300 text-center">
                    Total Score
                  </TableHead>
                  <TableHead className="text-zinc-300 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((reg: RegistrationWithEvent) => (
                  <TableRow
                    key={reg.id}
                    className={cn(
                      "border-zinc-800 hover:bg-zinc-800/50",
                      reg.isLive && "bg-primary/5 border-primary/20",
                    )}
                  >
                    <TableCell>
                      <input
                        type="radio"
                        checked={!!reg.isLive}
                        onChange={() => handleToggleLive(reg.id)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                        title="Set as Live Player"
                      />
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {reg.playerId || `Legacy-${reg.id}`}
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
                    <TableCell>{reg.fullName}</TableCell>
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
                    <TableCell className="text-center">
                      <div className="flex justify-center items-center gap-2">
                        <div className="flex gap-1.5 text-primary">
                          {reg.socialProofs &&
                            reg.socialProofs.includes("youtube") && (
                              <div title="YouTube Verified">
                                <Youtube className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                        </div>
                        {(() => {
                          if (!reg.socialProofs) return null;
                          const proofs = parseProofs(reg.socialProofs);
                          const firstProofUrl = Object.values(proofs)[0];

                          if (!firstProofUrl) {
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-zinc-600 cursor-default hover:bg-transparent hover:text-zinc-600 shadow-none pointer-events-none"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => setViewingProofs(reg)}
                              className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-700 hover:border-primary transition-colors cursor-pointer group shrink-0"
                              title="View proofs"
                            >
                              <img
                                src={firstProofUrl}
                                alt="Proof Thumbnail"
                                className="w-full h-full object-cover"
                              />
                              {Object.keys(proofs).length > 1 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white group-hover:bg-black/40 transition-colors">
                                  +{Object.keys(proofs).length - 1}
                                </div>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {reg.scanned ? (
                        <Badge
                          variant="default"
                          className="bg-primary hover:bg-primary/90"
                        >
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-zinc-400 border-zinc-700"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary text-base">
                        {reg.totalScore ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        {!reg.scanned && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded-full shadow-[0_0_15px_rgba(255,8,8,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 group"
                            onClick={() => handleVerifyClick(reg)}
                            disabled={isVerifying === reg.id}
                          >
                            Mark Scanned
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider bg-primary hover:text-primary-foreground border-0 hover:bg-primary/90 text-white rounded-full shadow-[0_0_15px_rgba(255,8,8,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 group"
                          onClick={() => setScoringRegistration(reg)}
                        >
                          Score
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDelete(reg)}
                          disabled={isDeleting === reg.id}
                          title="Delete registration"
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              isDeleting === reg.id ? "animate-pulse" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      <ScoreModal
        isOpen={!!scoringRegistration}
        onClose={() => setScoringRegistration(null)}
        registration={scoringRegistration}
      />

      <ConfirmDeleteDialog
        isOpen={!!registrationToVerify}
        onClose={() => setRegistrationToVerify(null)}
        onConfirm={handleVerify}
        title="Verify Registration"
        confirmText="Yes, Mark Scanned"
        description={
          <p>
            Are you sure you want to mark the registration for{" "}
            <span className="text-zinc-100 font-semibold">
              "{registrationToVerify?.fullName}"
            </span>{" "}
            as verified? This will grant them access to the event.
          </p>
        }
        isLoading={isVerifying === registrationToVerify?.id}
      />
    </div>
  );
}
