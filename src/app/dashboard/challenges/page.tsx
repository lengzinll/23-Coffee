"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import { rpc } from "@/lib/rpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Filter, Trophy, Pencil } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type ApiEventWithCounts } from "@/lib/types";

// Note: Type placeholder since we haven't added it to specific types file yet
interface ApiChallenge {
  id: number;
  eventId: number;
  name: string;
  eventName?: string | null;
  createdAt: string | null;
}

export default function ChallengesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [challengeToDelete, setChallengeToDelete] =
    useState<ApiChallenge | null>(null);
  const [challengeToEdit, setChallengeToEdit] = useState<ApiChallenge | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editEventId, setEditEventId] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Events filter state
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  // For Create Modal
  const [createEventId, setCreateEventId] = useState<string>("");

  const { data: events } = useSWR("/api/event", async () => {
    const res = await rpc.event.$get();
    const json = await res.json();
    return json.data;
  });

  // Fetch all events challenges sequentially (quick hack to get all, ideally a dedicated endpoint)
  // Or since we must filter by an event usually, let's fetch based on selection.
  const {
    data: challenges,
    mutate,
    isLoading: isLoadingChallenges,
  } = useSWR(
    selectedEventId !== "all"
      ? `/api/challenge/event/${selectedEventId}`
      : `/api/challenge/event/all`,
    async () => {
      const res = await rpc.challenge.event[":eventId"].$get({
        param: { eventId: selectedEventId },
      });
      const json = await res.json();
      if ("data" in json) {
        return json.data;
      }
      return [];
    },
  );

  const handleSave = async () => {
    if (!name) {
      toast.error("Challenge name is required");
      return;
    }
    if (!createEventId) {
      toast.error("Please select an Event");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rpc.challenge.$post({
        json: { eventId: parseInt(createEventId, 10), name },
      });
      if (res.ok) {
        toast.success("Challenge created");
        setIsCreateOpen(false);
        // Only trigger mutate if the newly created challenge belongs to the currently viewed event, or if viewing all
        if (selectedEventId === createEventId || selectedEventId === "all") {
          mutate();
        }
      } else {
        toast.error("Failed to save challenge");
      }
      setName("");
      setCreateEventId("");
    } catch (error) {
      toast.error("Failed to save challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!challengeToDelete) return;
    try {
      const res = await rpc.challenge[":id"].$delete({
        param: { id: challengeToDelete.id.toString() },
      });
      if (res.ok) {
        toast.success("Challenge deleted");
        setChallengeToDelete(null);
        mutate();
      }
    } catch (error) {
      toast.error("Failed to delete challenge");
    }
  };

  const openEdit = (challenge: ApiChallenge) => {
    setChallengeToEdit(challenge);
    setEditName(challenge.name);
    setEditEventId(challenge.eventId.toString());
  };

  const handleEditSave = async () => {
    if (!challengeToEdit) return;
    if (!editName) {
      toast.error("Challenge name is required");
      return;
    }
    if (!editEventId) {
      toast.error("Please select an Event");
      return;
    }
    setIsEditing(true);
    try {
      const res = await rpc.challenge[":id"].$patch({
        param: { id: challengeToEdit.id.toString() },
        json: { name: editName, eventId: parseInt(editEventId, 10) },
      });
      if (res.ok) {
        toast.success("Challenge updated");
        setChallengeToEdit(null);
        mutate();
      } else {
        toast.error("Failed to update challenge");
      }
    } catch (error) {
      toast.error("Failed to update challenge");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Challenges</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Define dynamic scoreable challenges for specific events.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Event Filter */}
          <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5 pr-2 w-full sm:w-64">
            <div className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800">
              <Filter className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col h-full justify-center w-full min-w-0">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider leading-none mb-1 ml-1">
                View Event
              </span>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="h-6 border-none bg-transparent p-1 focus:ring-0 text-xs font-medium text-zinc-200 truncate pr-0">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="all">All Challenges</SelectItem>
                  {events?.map((event: ApiEventWithCounts) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsCreateOpen(false);
                setName("");
                setCreateEventId("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Challenge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Event</label>
                  <Select
                    value={createEventId}
                    onValueChange={setCreateEventId}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 w-full">
                      <SelectValue placeholder="Assign to Event" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      {events?.map((event: ApiEventWithCounts) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Challenge Name</label>
                  <Input
                    placeholder="e.g. Penalty Shootout"
                    className="bg-zinc-800 border-zinc-700"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Challenges Configuration</CardTitle>
          <CardDescription className="text-zinc-400">
            {selectedEventId === "all"
              ? `Showing all ${challenges?.length || 0} challenges across all events.`
              : `Showing ${challenges?.length || 0} challenges for the selected event.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800 text-sm max-h-[500px] overflow-auto relative">
            <Table>
              <TableHeader className="bg-zinc-800/50">
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Event</TableHead>
                  <TableHead className="text-zinc-300">Created At</TableHead>
                  <TableHead className="text-zinc-300 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingChallenges ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-40 text-center text-zinc-500"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto opacity-50" />
                    </TableCell>
                  </TableRow>
                ) : challenges && challenges.length > 0 ? (
                  challenges.map((challenge: ApiChallenge) => (
                    <TableRow
                      key={challenge.id}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell className="font-medium text-white">
                        {challenge.name}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {challenge.eventName || "—"}
                      </TableCell>
                      <TableCell
                        className="text-zinc-400 text-xs"
                        suppressHydrationWarning
                      >
                        {challenge.createdAt
                          ? new Date(challenge.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-zinc-800 hover:text-primary"
                            onClick={() => openEdit(challenge)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-zinc-800 hover:text-red-500"
                            onClick={() => setChallengeToDelete(challenge)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2">
                        <Trophy className="w-8 h-8 opacity-20" />
                        <p>No challenges created for this event yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        isOpen={!!challengeToDelete}
        onClose={() => setChallengeToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Challenge"
        description={`Are you sure you want to delete "${challengeToDelete?.name}"? All associated participant scores will also be permanently deleted. This action cannot be undone.`}
      />

      {/* Edit Challenge Dialog */}
      <Dialog
        open={!!challengeToEdit}
        onOpenChange={(open) => {
          if (!open) setChallengeToEdit(null);
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Challenge Name
              </label>
              <Input
                placeholder="e.g. Sprint Challenge"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Event</label>
              <Select value={editEventId} onValueChange={setEditEventId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  {events?.map((event: ApiEventWithCounts) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChallengeToEdit(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleEditSave}
              disabled={isEditing}
            >
              {isEditing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
