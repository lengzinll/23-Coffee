"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { rpc } from "@/lib/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Trash2,
  Power,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Facebook,
  Send,
  Music2,
  Youtube,
  Link as LinkIcon,
  Loader2,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { TimePicker } from "@/components/time-picker";
import {
  type ApiEventWithCounts,
  type ApiSocialMediaTask,
  type ApiLocation,
} from "@/lib/types";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

export default function EventsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiEventWithCounts | null>(
    null,
  );
  const [eventToDelete, setEventToDelete] = useState<ApiEventWithCounts | null>(
    null,
  );
  const [eventToEdit, setEventToEdit] = useState<ApiEventWithCounts | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("none");

  // Set today's date on the client only to avoid SSR/client hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTasks, setEventTasks] = useState<ApiSocialMediaTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskType, setNewTaskType] = useState<
    "facebook" | "tiktok" | "telegram" | "youtube"
  >("facebook");
  const [newTaskUrl, setNewTaskUrl] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: events,
    mutate,
    isLoading: isLoadingEvents,
  } = useSWR("/api/event", async () => {
    const res = await rpc.event.$get();
    return (await res.json()).data;
  });

  const { data: locations, isLoading: isLoadingLocations } = useSWR(
    "/api/location",
    async () => {
      const res = await rpc.location.$get();
      return (await res.json()).data;
    },
  );

  const isLoading = isLoadingEvents || isLoadingLocations;

  if (isLoading) return <LoadingScreen message="Loading events..." />;

  if (!mounted) return null;

  const filteredEvents =
    events?.filter((ev: ApiEventWithCounts) =>
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  const handleCreate = async () => {
    if (!newName || !selectedDate || !selectedTime) {
      toast.error("Please fill in all fields");
      return;
    }

    const dateWithTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    dateWithTime.setHours(hours, minutes);

    try {
      const res = await rpc.event.$post({
        json: {
          name: newName,
          description: newDescription,
          date: dateWithTime.toISOString(),
          status: "inactive",
          locationId:
            selectedLocationId === "none" ? null : parseInt(selectedLocationId),
        },
      });
      if (res.ok) {
        toast.success("Event created");
        setIsCreateOpen(false);
        setNewName("");
        setNewDescription("");
        setSelectedDate(new Date());
        setSelectedTime("18:00");
        setSelectedLocationId("none");
        mutate();
      }
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const openEdit = (ev: ApiEventWithCounts) => {
    setEventToEdit(ev);
    setNewName(ev.name);
    setNewDescription(ev.description || "");
    const d = new Date(ev.date);
    setSelectedDate(d);
    setSelectedTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setSelectedLocationId(ev.locationId ? ev.locationId.toString() : "none");
  };

  const resetFormFields = () => {
    setNewName("");
    setNewDescription("");
    setSelectedDate(new Date());
    setSelectedTime("18:00");
    setSelectedLocationId("none");
  };

  const handleEditSave = async () => {
    if (!eventToEdit) return;
    if (!newName || !selectedDate || !selectedTime) {
      toast.error("Please fill in all required fields (Name, Date, Time)");
      return;
    }

    setIsEditing(true);
    const dateWithTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    dateWithTime.setHours(hours, minutes);

    try {
      const res = await rpc.event[":id"].$patch({
        param: { id: eventToEdit.id.toString() },
        json: {
          name: newName,
          description: newDescription,
          date: dateWithTime.toISOString(),
          locationId:
            selectedLocationId === "none" ? null : parseInt(selectedLocationId),
        },
      });
      if (res.ok) {
        toast.success("Event updated");
        setEventToEdit(null);
        resetFormFields();
        mutate();
      } else {
        toast.error("Failed to update event");
      }
    } catch (error) {
      toast.error("Failed to update event");
    } finally {
      setIsEditing(false);
    }
  };

  const handleActivate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await rpc.event[":id"].activate.$post({
        param: { id: id.toString() },
      });
      if (res.ok) {
        toast.success("Event activated");
        mutate();
      }
    } catch (error) {
      toast.error("Failed to activate event");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, ev: ApiEventWithCounts) => {
    e.stopPropagation();
    setEventToDelete(ev);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      const res = await rpc.event[":id"].$delete({
        param: { id: eventToDelete.id.toString() },
      });
      if (res.ok) {
        toast.success("Event deleted successfully");
        setEventToDelete(null);
        mutate();
      } else {
        const errorData = (await res.json()) as { error?: string };
        toast.error(errorData.error || "Failed to delete event");
        setEventToDelete(null);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setEventToDelete(null);
    }
  };

  const fetchTasks = async (eventId: number) => {
    setIsLoadingTasks(true);
    try {
      const res = await rpc.event[":id"].tasks.$get({
        param: { id: eventId.toString() },
      });
      const data = await res.json();
      setEventTasks(data.data || []);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedEvent || !newTaskUrl) return;
    setIsAddingTask(true);
    try {
      const res = await rpc.event.tasks.$post({
        json: {
          eventId: selectedEvent.id,
          type: newTaskType,
          url: newTaskUrl,
          label: newTaskLabel || undefined,
        },
      });
      if (res.ok) {
        toast.success("Task added");
        setNewTaskUrl("");
        setNewTaskLabel("");
        fetchTasks(selectedEvent.id);
      }
    } catch (error) {
      toast.error("Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const res = await rpc.event.tasks[":id"].$delete({
        param: { id: taskId.toString() },
      });
      if (res.ok) {
        toast.success("Task removed");
        if (selectedEvent) fetchTasks(selectedEvent.id);
      }
    } catch (error) {
      toast.error("Failed to remove task");
    }
  };

  const handleEventClick = (ev: ApiEventWithCounts) => {
    setSelectedEvent(ev);
    fetchTasks(ev.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Events</h1>
          <p className="text-sm mt-1">
            Create and oversee all tournament matches and events.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-sm h-10 ring-offset-zinc-950 focus-visible:ring-primary/50"
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary w-full sm:w-auto cursor-pointer hover:bg-primary/90">
                <Plus className="w-4 h-4 " /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium ">Event Name</label>
                  <Input
                    placeholder="e.g. Next Play Live 2026"
                    className="bg-zinc-800 border-zinc-700 h-11"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium ">Description</label>
                  <textarea
                    placeholder="Add event details..."
                    className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium ">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700 h-11",
                            !selectedDate && "text-muted-foreground",
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4 text-primary" />
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-zinc-900 border-zinc-800"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          className="bg-zinc-900 text-zinc-100"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium ">Time</label>
                    <TimePicker
                      value={selectedTime}
                      onChange={setSelectedTime}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Location</label>
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-11">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="none">No Location</SelectItem>
                      {locations?.map((loc: ApiLocation) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetFormFields();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 min-w-24 cursor-pointer"
                  onClick={handleCreate}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEvents.map((ev: ApiEventWithCounts) => (
          <Card
            key={ev.id}
            className="bg-zinc-900 border-zinc-800 overflow-hidden group cursor-pointer hover:border-red-500/30 transition-all hover:bg-zinc-900/80"
            onClick={() => handleEventClick(ev)}
          >
            <CardHeader className="flex flex-row items-start justify-between p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl text-zinc-100">
                    {ev.name}
                  </CardTitle>
                  {ev.status === "active" && (
                    <span className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-primary/20">
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p className="text-sm text-zinc-400 line-clamp-1 pt-1 max-w-xl">
                    {ev.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div
                    className="flex items-center text-sm text-zinc-400"
                    suppressHydrationWarning
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                    {format(new Date(ev.date), "PPP")}
                  </div>
                  <div className="flex items-center text-sm text-zinc-400">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                    {format(new Date(ev.date), "p")}
                  </div>
                  <div className="flex items-center text-sm text-zinc-400">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                    {ev.registrationCount} Registrations
                  </div>
                  {ev.locationId && (
                    <div className="flex items-center text-sm text-primary/80">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      {locations?.find(
                        (l: ApiLocation) => l.id === ev.locationId,
                      )?.name || "Location"}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {ev.status === "inactive" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/30 bg-zinc-900 text-primary hover:bg-primary/10 hover:border-primary/50 hover:text-primary  cursor-pointer"
                    onClick={(e) => handleActivate(e, ev.id)}
                  >
                    <Power className="w-4 h-4 mr-2" /> Activate
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 text-primary text-sm px-3 py-1 bg-primary/5 rounded border border-primary/10">
                    <CheckCircle2 className="w-4 h-4" /> Live
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-500 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(ev);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  onClick={(e) => handleDeleteClick(e, ev)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}

        {(!filteredEvents || filteredEvents.length === 0) && (
          <div className="text-center py-20 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
            <Calendar className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
            <h3 className="text-zinc-300 font-medium">No events found</h3>
            <p className="text-zinc-500 text-sm">
              Create your first event to start accepting registrations.
            </p>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {selectedEvent?.name}
              {selectedEvent?.status === "active" && (
                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 uppercase tracking-widest font-bold">
                  Active
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800 text-center space-y-1">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Total
                </div>
                <div className="text-2xl font-bold text-zinc-100">
                  {selectedEvent?.registrationCount}
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-center space-y-1">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Scanned
                </div>
                <div className="text-2xl font-bold text-primary">
                  {selectedEvent?.scannedCount}
                </div>
              </div>
              <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 text-center space-y-1">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Pending
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {selectedEvent?.pendingCount}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-400 px-1">
                Engagement
              </h4>
              <div className="bg-zinc-800/20 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{
                    width: `${((selectedEvent?.scannedCount ?? 0) / (selectedEvent?.registrationCount || 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 px-1">
                <span>Check-in rate</span>
                <span>
                  {Math.round(
                    ((selectedEvent?.scannedCount ?? 0) /
                      (selectedEvent?.registrationCount || 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-zinc-800/50">
              <h4 className="text-sm font-medium text-zinc-400 px-1">
                Social Verification Tasks
              </h4>

              <div className="space-y-3">
                {isLoadingTasks ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                  </div>
                ) : eventTasks.length > 0 ? (
                  eventTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between bg-zinc-800/30 p-3 rounded-lg border border-zinc-800 group/task"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-md">
                          {task.type === "facebook" && (
                            <Facebook className="w-4 h-4 text-blue-400" />
                          )}
                          {task.type === "telegram" && (
                            <Send className="w-4 h-4 text-sky-400" />
                          )}
                          {task.type === "tiktok" && (
                            <Music2 className="w-4 h-4 text-pink-400" />
                          )}
                          {task.type === "youtube" && (
                            <Youtube className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-200">
                            {task.label ||
                              task.type.charAt(0).toUpperCase() +
                                task.type.slice(1)}
                          </div>
                          <div className="text-xs text-zinc-500 truncate max-w-[180px]">
                            {task.url}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover/task:opacity-100 text-zinc-500 hover:text-primary transition-all"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-zinc-500 italic">
                    No tasks added for this event.
                  </div>
                )}
              </div>

              <div className="p-4 bg-zinc-950/30 rounded-xl border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Add Requirement
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["facebook", "tiktok", "telegram", "youtube"] as const).map(
                    (type) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "capitalize border-zinc-800 text-xs",
                          newTaskType === type
                            ? "bg-primary/10 hover:bg-primary hover:text-primary-foreground  border-primary/50 text-primary"
                            : "bg-zinc-900",
                        )}
                        onClick={() => setNewTaskType(type)}
                      >
                        {type}
                      </Button>
                    ),
                  )}
                </div>
                <Input
                  placeholder="Social URL (e.g. fb.com/page)"
                  className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  value={newTaskUrl}
                  onChange={(e) => setNewTaskUrl(e.target.value)}
                />
                <Input
                  placeholder="Label (optional)"
                  className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                />
                <Button
                  className="w-full text-primary-foreground   text-xs font-bold h-9"
                  disabled={!newTaskUrl || isAddingTask}
                  onClick={handleAddTask}
                >
                  {isAddingTask ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add Task"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-3 text-sm ">
                <Calendar className="w-4 h-4 text-primary" />
                {selectedEvent && format(new Date(selectedEvent.date), "PPP")}
              </div>
              <div className="flex items-center gap-3 text-sm ">
                <Clock className="w-4 h-4 text-primary" />
                {selectedEvent && format(new Date(selectedEvent.date), "p")}
              </div>

              {selectedEvent?.description && (
                <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Description
                  </h4>
                  <p className="text-sm  leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent?.locationId && (
                <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Location
                  </h4>
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {locations?.find(
                        (l: ApiLocation) => l.id === selectedEvent.locationId,
                      )?.name || "Location"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-zinc-800 hover:bg-zinc-700  border-zinc-700"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={confirmDelete}
        requireValidationText="CONFIRM"
        description={
          <p>
            This will permanently delete the event{" "}
            <span className="text-zinc-100 font-semibold">
              "{eventToDelete?.name}"
            </span>
            . This action is irreversible and cannot be undone.
          </p>
        }
        confirmText="Yes, Delete Event"
      />

      {/* Edit Event Dialog */}
      <Dialog
        open={!!eventToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setEventToEdit(null);
            resetFormFields();
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Event Name</label>
              <Input
                placeholder="e.g. Next Play Live 2026"
                className="bg-zinc-800 border-zinc-700 h-11"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Description</label>
              <textarea
                placeholder="Add event details..."
                className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700 h-11",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4 text-primary" />
                      {selectedDate ? (
                        format(selectedDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-zinc-900 border-zinc-800"
                    align="start"
                  >
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="bg-zinc-900 text-zinc-100"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Time</label>
                <TimePicker value={selectedTime} onChange={setSelectedTime} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Location</label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-11">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="none">No Location</SelectItem>
                  {locations?.map((loc: ApiLocation) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                setEventToEdit(null);
                resetFormFields();
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 min-w-24 cursor-pointer"
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
