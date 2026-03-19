"use client";

import ScoreOverlay from "./_component/score-overlay";
import ScoreCard from "./_component/score-card";
import { rpc } from "@/lib/rpc";
import useSWR from "swr";
import { ApiLivePlayer } from "@/lib/types";

const PageLeaderBoard = () => {
  // Update setPlayer calls to include challenges
  const mapPlayer = (p: any) => ({
    id: p.id,
    name: p.fullName,
    age: p.age,
    role: p.position,
    score: p.totalScore || 0,
    photoUrl: p.profileImage,
    playerId: p.playerId,
    challenges: p.challenges || [], // Dynamically populated from backend
  });

  // 1. Use SWR for high-frequency polling (0.5s interval)
  const { data: body, error } = useSWR(
    "live-player",
    async () => {
      const res = await rpc.register.live.$get();
      if (!res.ok) throw new Error("Failed to fetch live player");
      return res.json();
    },
    {
      refreshInterval: 500, // 0.5 seconds for "live" feel
      revalidateOnFocus: true,
    },
  );

  const player =
    body?.success && body.data ? mapPlayer(body.data as ApiLivePlayer) : null;

  return (
    <div className="min-h-screen bg-background p-12 flex flex-col items-center gap-16 overflow-hidden">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter text-foreground italic flex items-center gap-4">
          LIVE <span className="text-primary animate-pulse">STREAM</span>
        </h1>
      </div>

      <div className="flex flex-col gap-12 w-full max-w-6xl items-center">
        {!player ? (
          <div className="text-zinc-500 font-bold uppercase tracking-widest text-xl h-[400px] flex items-center justify-center">
            {error
              ? "Error connecting to server..."
              : "Waiting for Live Player Selection..."}
          </div>
        ) : (
          <>
            <div className="w-full space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60 ml-2">
                ACTIVE PLAYER
              </span>
              <ScoreOverlay
                playerKey={player.id}
                player={{
                  name: player.name,
                  age: player.age,
                  role: player.role,
                  score: player.score,
                  photoUrl: player.photoUrl,
                  challenges: player.challenges,
                }}
              />
            </div>
            <ScoreCard
              player={{
                name: player.name,
                age: player.age,
                role: player.role,
                score: player.score,
                photoUrl: player.photoUrl,
                challenges: player.challenges,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PageLeaderBoard;
