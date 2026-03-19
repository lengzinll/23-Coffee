"use client";

import React from "react";
import { User, Trophy, Star, Target, Zap, Shield, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface ScoreCardProps {
  player: {
    photoUrl?: string;
    name: string;
    age: number | string;
    role: string;
    score: number;
    challenges?: { name: string; score: number }[];
  };
  className?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ player, className }) => {
  const challenges = player.challenges || [];

  return (
    <div
      className={cn(
        "group relative w-[340px] overflow-hidden",
        "bg-background/40 backdrop-blur-2xl border border-primary/20",
        className,
      )}
    >
      {/* Top Image Section */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent z-10" />
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <User className="w-20 h-20 text-muted-foreground/20" />
          </div>
        )}

        {/* Score Badge */}
        <div className="absolute top-4 right-4 z-20 bg-primary/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2">
          <Trophy className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white tracking-wider">
            #{Math.floor(Math.random() * 10) + 1}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-20 px-6 pb-8 -mt-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-foreground drop-shadow-md">
            {player.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80 px-2 py-0.5 rounded border border-primary/30 bg-primary/5">
              {player.role}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {player.age} Years • Pro League
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          {challenges.map((c, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[100px]">
                  {c.name}
                </span>
              </div>
              <div className="text-xl font-black tabular-nums text-foreground">
                <AnimatedNumber value={c.score} duration={800} />
              </div>
            </div>
          ))}
        </div>

        {/* Total Score Footer */}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
          <div className="flex flex-col"></div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Total Score
            </span>
            <div className="text-4xl font-black tabular-nums bg-linear-to-br from-white to-white/40 bg-clip-text text-transparent italic">
              <AnimatedNumber value={player.score} duration={1000} />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />
    </div>
  );
};

export default ScoreCard;
