"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { rpc } from "@/lib/rpc";

const fetcher = async () => {
  const res = await rpc.settings.$get();
  if (!res.ok) throw new Error("Failed to fetch settings");
  const result = await res.json();
  return result.data;
};

export default function SettingsPage() {
  const { data: settings, isLoading, mutate } = useSWR("/api/settings", fetcher);
  
  const [stampsPerCycle, setStampsPerCycle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && settings["STAMPS_PER_CYCLE"]) {
      setStampsPerCycle(settings["STAMPS_PER_CYCLE"]);
    }
  }, [settings]);

  const handleSave = async () => {
    const value = parseInt(stampsPerCycle, 10);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number for Stamps per Cycle");
      return;
    }

    setIsSaving(true);
    try {
      const res = await rpc.settings.$post({
        json: { key: "STAMPS_PER_CYCLE", value: value.toString() }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Settings updated successfully");
        mutate();
      } else {
        toast.error(result.message || "Failed to update settings");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingScreen message="Loading settings..." />;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure global system behavior and constants.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Reward Settings</CardTitle>
          <CardDescription>
            Configure how stamps are accumulated for rewards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stampsPerCycle" className="text-zinc-200">Stamps Required for Free Coffee</Label>
            <Input
              id="stampsPerCycle"
              type="number"
              min="1"
              value={stampsPerCycle}
              onChange={(e) => setStampsPerCycle(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-zinc-200"
            />
            <p className="text-xs text-zinc-500">
              The number of stamps a customer needs to collect to earn a reward.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-800/50 px-6 py-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90 font-bold"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}