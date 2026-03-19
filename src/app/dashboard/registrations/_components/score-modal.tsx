"use client";

import { useState, useEffect, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import { rpc } from "@/lib/rpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { type RegistrationWithEvent } from "@/lib/types";

import { cn } from "@/lib/utils";

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RegistrationWithEvent | null;
}

export function ScoreModal({ isOpen, onClose, registration }: ScoreModalProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const [scores, setScores] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch challenges for the user's event
  const { data: challenges, isLoading: isLoadingChallenges } = useSWR(
    registration && isOpen
      ? `/api/challenge/event/${registration.eventId}`
      : null,
    async () => {
      const res = await rpc.challenge.event[":eventId"].$get({
        param: { eventId: registration!.eventId!.toString() },
      });
      const json = await res.json();
      if ("data" in json) {
        return json.data;
      }
      return [];
    },
  );

  // Fetch existing scores for this event to pre-fill
  const {
    data: existingScores,
    isLoading: isLoadingScores,
    mutate: mutateScores,
  } = useSWR(
    registration && isOpen
      ? `/api/challenge/scores/${registration.eventId}`
      : null,
    async () => {
      const res = await rpc.challenge.scores[":eventId"].$get({
        param: { eventId: registration!.eventId!.toString() },
      });
      const json = await res.json();
      // Filter scores just for this user
      if ("data" in json && Array.isArray(json.data)) {
        return json.data.filter((s: any) => s.registerId === registration!.id);
      }
      return [];
    },
  );

  // Pre-fill score inputs when data loads
  useEffect(() => {
    if (existingScores && challenges) {
      const initialScores: Record<number, string> = {};
      existingScores.forEach((s: any) => {
        initialScores[s.challengeId] = s.score.toString();
      });
      setScores(initialScores);
    }
  }, [existingScores, challenges]);

  const handleScoreChange = (challengeId: number, value: string) => {
    // Only allow numbers or empty string
    if (value === "" || /^\d+$/.test(value)) {
      setScores((prev) => ({ ...prev, [challengeId]: value }));
    }
  };

  const handleSave = async () => {
    if (!registration) return;
    setIsSaving(true);
    let successCount = 0;

    try {
      // We process all challenges, if a score is entered we save/update it
      for (const challenge of challenges || []) {
        const scoreValue = scores[challenge.id];
        if (scoreValue !== undefined && scoreValue !== "") {
          const res = await rpc.challenge.score.$put({
            json: {
              registerId: registration.id,
              challengeId: challenge.id,
              score: parseInt(scoreValue, 10),
            },
          });
          if (res.ok) successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Saved scores for ${successCount} challenge(s)`);
        mutateScores();
        // Also refresh the registrations list so totalScore updates in real-time
        globalMutate("/api/register");
        onClose();
      } else {
        toast.info("No scores were entered to save.");
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save some scores.");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce(
      (sum, val) => sum + (parseInt(val) || 0),
      0,
    );
  };

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < (challenges?.length || 0) - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        saveButtonRef.current?.focus();
      }
    }
  };

  const isLoading = isLoadingChallenges || isLoadingScores;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-zinc-800/50 bg-zinc-950/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Player Scores
                </DialogTitle>
                <div className="text-sm text-zinc-500 font-medium">
                  {registration?.fullName}{" "}
                  <span className="text-zinc-600 ml-1 font-normal opacity-80">
                    ({registration?.playerId || `Legacy-${registration?.id}`})
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              <p className="text-xs text-zinc-500 font-medium animate-pulse">
                Loading tournament data...
              </p>
            </div>
          ) : !challenges || challenges.length === 0 ? (
            <div className="text-center p-8 text-zinc-500 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/30">
              <p className="text-sm font-medium">
                No challenges found for this event.
              </p>
              <p className="text-xs mt-2 text-zinc-600">
                Challenges must be created in the Challenges section first.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge, index: number) => (
                <div
                  key={challenge.id}
                  className="flex justify-between items-center bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group"
                >
                  <label className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {challenge.name}
                  </label>
                  <div className="relative">
                    <Input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-20 text-center bg-zinc-900/50 border-zinc-700/50 focus:border-primary/50 focus:ring-primary/20 font-bold text-base h-10 transition-all"
                      value={scores[challenge.id] || ""}
                      onChange={(e) =>
                        handleScoreChange(challenge.id, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, index)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-950/40 border-t border-zinc-800/50">
          <div className="flex justify-between items-center mb-6 px-1">
            <div className="space-y-0.5">
              <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                Total Performance
              </span>
              <p className="text-xs text-zinc-600">
                Calculated from all challenges
              </p>
            </div>
            <div className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              {calculateTotal()}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-zinc-400 me-3 hover:text-zinc-100 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              ref={saveButtonRef}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-lg shadow-primary/20"
              disabled={isLoading || isSaving || !challenges?.length}
              onClick={handleSave}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Daily Scores"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
