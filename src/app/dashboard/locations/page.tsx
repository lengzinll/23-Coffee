"use client";

import useSWR from "swr";
import { useState } from "react";
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
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  MapPin,
  ExternalLink,
  Loader2,
  Edit2,
  Search,
  Filter,
} from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type ApiLocation } from "@/lib/types";
import { useMemo } from "react";

export default function LocationsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ApiLocation | null>(
    null,
  );
  const [locationToDelete, setLocationToDelete] = useState<ApiLocation | null>(
    null,
  );
  const [name, setName] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: locations,
    mutate,
    isLoading,
  } = useSWR("/api/location", async () => {
    const res = await rpc.location.$get();
    const json = await res.json();
    return json.data;
  });

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!searchTerm) return locations;

    const term = searchTerm.toLowerCase();
    return locations.filter((loc: ApiLocation) =>
      loc.name.toLowerCase().includes(term),
    );
  }, [locations, searchTerm]);

  if (isLoading) return <LoadingScreen message="Loading locations..." />;

  const handleSave = async () => {
    if (!name) {
      toast.error("Location name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLocation) {
        const res = await rpc.location[":id"].$patch({
          param: { id: editingLocation.id.toString() },
          json: { name, mapUrl: mapUrl || null },
        });
        if (res.ok) {
          toast.success("Location updated");
          setEditingLocation(null);
          mutate();
        }
      } else {
        const res = await rpc.location.$post({
          json: { name, mapUrl: mapUrl || null },
        });
        if (res.ok) {
          toast.success("Location created");
          setIsCreateOpen(false);
          mutate();
        }
      }
      setName("");
      setMapUrl("");
    } catch (error) {
      toast.error("Failed to save location");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    try {
      const res = await rpc.location[":id"].$delete({
        param: { id: locationToDelete.id.toString() },
      });
      if (res.ok) {
        toast.success("Location deleted");
        setLocationToDelete(null);
        mutate();
      }
    } catch (error) {
      toast.error("Failed to delete location");
    }
  };

  const openEdit = (loc: ApiLocation) => {
    setEditingLocation(loc);
    setName(loc.name);
    setMapUrl(loc.mapUrl || "");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Locations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Define venue locations for your events.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by location name..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-primary/50 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog
            open={isCreateOpen || !!editingLocation}
            onOpenChange={(open) => {
              if (!open) {
                setIsCreateOpen(false);
                setEditingLocation(null);
                setName("");
                setMapUrl("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Location" : "Create New Location"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Location Name</label>
                  <Input
                    placeholder="e.g. Aeon Mall Sen Sok"
                    className="bg-zinc-800 border-zinc-700"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    Google Maps URL (Optional)
                  </label>
                  <Input
                    placeholder="https://goo.gl/maps/..."
                    className="bg-zinc-800 border-zinc-700"
                    value={mapUrl}
                    onChange={(e) => setMapUrl(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingLocation(null);
                  }}
                >
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
          <CardTitle className="text-lg">All Locations</CardTitle>
          <CardDescription className="text-zinc-400">
            Showing {filteredLocations.length} of {locations?.length || 0}{" "}
            locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800 text-sm max-h-[500px] overflow-auto relative">
            <Table>
              <TableHeader className="bg-zinc-800/50">
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Map Link</TableHead>
                  <TableHead className="text-zinc-300">Created At</TableHead>
                  <TableHead className="text-zinc-300 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((loc: ApiLocation) => (
                  <TableRow
                    key={loc.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      {loc.mapUrl ? (
                        <a
                          href={loc.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" /> View Map
                        </a>
                      ) : (
                        <span className="text-zinc-500 text-xs">No link</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-zinc-400 text-xs"
                      suppressHydrationWarning
                    >
                      {loc.createdAt
                        ? new Date(loc.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-zinc-800 hover:text-primary"
                          onClick={() => openEdit(loc)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-zinc-800 hover:text-red-500"
                          onClick={() => setLocationToDelete(loc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2">
                        <MapPin className="w-8 h-8 opacity-20" />
                        <p>
                          {searchTerm
                            ? `No locations found matching "${searchTerm}"`
                            : "No locations created yet."}
                        </p>
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
        isOpen={!!locationToDelete}
        onClose={() => setLocationToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Location"
        description={`Are you sure you want to delete "${locationToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
