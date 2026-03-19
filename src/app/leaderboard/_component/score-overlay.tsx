"use client";

import React from "react";
import { User, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface ScoreOverlayProps {
  player: {
    photoUrl?: string;
    name: string;
    age: number | string;
    role: string;
    score: number;
    challenges?: { name: string; score: number }[];
  };
  /** Change this value whenever the player identity changes to re-trigger the entry animation */
  playerKey?: string | number;
  className?: string;
}

const ScoreOverlay: React.FC<ScoreOverlayProps> = ({
  player,
  playerKey,
  className,
}) => {
  const challenges = player.challenges || [];

  return (
    <>
      {/* Keyframe definitions — injected once, scoped to this component */}
      <style>{`
        @keyframes so-photo-in {
          from { opacity: 0; transform: scale(0.6) rotate(-8deg); filter: blur(6px); }
          to   { opacity: 1; transform: scale(1)   rotate(0deg);  filter: blur(0px); }
        }
        @keyframes so-name-in {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0px); }
        }
        @keyframes so-meta-in {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0px); }
        }
        .so-photo-anim {
          animation: so-photo-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .so-name-anim {
          animation: so-name-in 0.4s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .so-meta-anim {
          animation: so-meta-in 0.4s cubic-bezier(0.22,1,0.36,1) 0.2s both;
        }
      `}</style>

      <div
        className={cn(
          "relative flex items-center gap-6 px-12 py-8 overflow-hidden",
          "bg-background/40 backdrop-blur-xl border border-primary/30 shadow-2xl",
          className,
        )}
      >
        {/* Decorative Background Gradient */}
        <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-transparent to-transparent pointer-events-none" />

        {/* Player Photo — re-mounts (and re-animates) when playerKey changes */}
        <div
          key={`photo-${playerKey}`}
          className="relative z-10 shrink-0 so-photo-anim"
        >
          <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden shadow-lg shadow-primary/20 bg-muted flex items-center justify-center">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          {/* Rank/Badge decoration */}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full border-2 border-background">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        {/* Player Details Container — also re-animates on player change */}
        <div
          key={`info-${playerKey}`}
          className="relative z-10 flex flex-col justify-center min-w-[200px]"
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground truncate so-name-anim">
            {player.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 so-meta-anim">
            <span className="px-2 py-0.5 rounded-md text-xs font-medium border border-primary/30">
              {player.role}
            </span>
            <span className="text-sm font-medium">{player.age} Years Old</span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-16 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />

        {challenges.map((c, idx) => (
          <div
            className="relative z-10 flex flex-col items-center justify-center px-6 min-w-[120px]"
            key={idx}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-primary/80 truncate max-w-[100px]">
                {c.name}
              </span>
            </div>
            <div className="text-5xl font-black tabular-nums tracking-tighter bg-linear-to-br from-white to-white/60 bg-clip-text text-transparent">
              <AnimatedNumber value={c.score} duration={800} />
            </div>
          </div>
        ))}

        {/* Score Section */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 min-w-[120px]">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80">
              Total
            </span>
          </div>
          <div className="text-5xl font-black tabular-nums tracking-tighter bg-linear-to-br from-white to-white/60 bg-clip-text text-transparent">
            <AnimatedNumber value={player.score} duration={1000} />
          </div>
        </div>

        {/* Dynamic Glow Effect */}
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
      </div>
    </>
  );
};

export default ScoreOverlay;
