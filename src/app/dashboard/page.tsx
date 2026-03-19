"use client";

import useSWR from "swr";
import { rpc } from "@/lib/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Loader2,
} from "lucide-react";
import { type RegistrationWithEvent } from "@/lib/types";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import ScoreTable from "./_component/score_table";

export default function DashboardOverview() {
  const {
    data: regsData,
    error: regsError,
    isLoading: regsLoading,
  } = useSWR("/api/register", async () => {
    const res = await rpc.register.$get();
    if (!res.ok) throw new Error(res.statusText);
    return (await res.json()).data;
  });

  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading,
  } = useSWR("/api/user", async () => {
    const res = await rpc.user.$get();
    if (!res.ok) throw new Error(res.statusText);
    return (await res.json()).data;
  });

  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR("/api/event", async () => {
    const res = await rpc.event.$get();
    if (!res.ok) throw new Error(res.statusText);
    return (await res.json()).data;
  });

  const totalRegs = regsData?.length || 0;
  const verifiedRegs =
    regsData?.filter((r: RegistrationWithEvent) => r.scanned)?.length ?? 0;
  const totalUsers = usersData?.length || 0;
  const totalEvents = eventsData?.length || 0;

  if (regsError)
    return <div className="text-destructive">{regsError.message}</div>;
  if (usersError)
    return <div className="text-destructive">{usersError.message}</div>;
  if (eventsError)
    return <div className="text-destructive">{eventsError.message}</div>;
  if (regsLoading || usersLoading || eventsLoading) {
    return <LoadingScreen message="Loading overview..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Dashboard Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Registrations
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{totalRegs}</div>
            <p className="text-xs text-zinc-500 mt-1">
              Users signed up for challenge
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Verified On-Site
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {verifiedRegs}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {totalRegs > 0 ? Math.round((verifiedRegs / totalRegs) * 100) : 0}
              % of all registrations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              System Admins
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{totalUsers}</div>
            <p className="text-xs text-zinc-500 mt-1">
              Users with dashboard access
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {totalEvents}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Active and upcoming events
            </p>
          </CardContent>
        </Card>
      </div>


      <ScoreTable />


    </div>
  );
}
