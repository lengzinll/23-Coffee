"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [hours, minutes] = value.split(":").map(Number);
  
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayMinutes = minutes.toString().padStart(2, "0");

  const setTime = (h: number, m: number) => {
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  };

  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700 h-11 px-3",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-emerald-500" />
          {displayHours}:{displayMinutes} {ampm}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl rounded-xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Hours</label>
            <div className="grid grid-cols-4 gap-1">
              {hoursOptions.map((h) => {
                const isSelected = (ampm === "AM" && h === (hours === 0 ? 12 : hours)) || 
                                   (ampm === "PM" && h === (hours > 12 ? hours - 12 : hours));
                // Wait, simpler:
                const actualHour = ampm === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
                const active = hours === actualHour;

                return (
                  <Button
                    key={h}
                    variant="ghost"
                    className={cn(
                      "h-8 w-full p-0 text-xs hover:bg-emerald-500/20 hover:text-emerald-400 font-medium",
                      active && "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
                    )}
                    onClick={() => setTime(actualHour, minutes)}
                  >
                    {h}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Minutes</label>
            <div className="grid grid-cols-4 gap-1">
              {minutesOptions.map((m) => (
                <Button
                  key={m}
                  variant="ghost"
                  className={cn(
                    "h-8 w-full p-0 text-xs hover:bg-emerald-500/20 hover:text-emerald-400 font-medium",
                    minutes === m && "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
                  )}
                  onClick={() => setTime(hours, m)}
                >
                  {m.toString().padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 pt-2 border-t border-zinc-800">
            <Button
              variant="ghost"
              className={cn(
                "flex-1 h-8 text-xs font-bold uppercase tracking-widest",
                ampm === "AM" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500"
              )}
              onClick={() => {
                const newHours = hours >= 12 ? hours - 12 : hours;
                setTime(newHours, minutes);
              }}
            >
              AM
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "flex-1 h-8 text-xs font-bold uppercase tracking-widest",
                ampm === "PM" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500"
              )}
              onClick={() => {
                const newHours = hours < 12 ? hours + 12 : hours;
                setTime(newHours, minutes);
              }}
            >
              PM
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
