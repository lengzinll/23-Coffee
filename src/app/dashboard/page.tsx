"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, Clock, CheckCircle, Activity, Coffee } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { type DateRange } from "react-day-picker";

const fetchStats = async (url: string) => {
  // Extract query params from SWR url
  const searchParams = new URL(url, window.location.origin).search;

  const res = await fetch(`/api/stats${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  const result = (await res.json()) as any;
  if (!result.success) throw new Error(result.error || "Unknown error");
  return result.data;
};

const defaultValue = {
  from: new Date(),
  to: new Date(),
}

export default function DashboardOverview() {
  const [date, setDate] = useState<DateRange | undefined>(defaultValue);

  const swrUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (date?.from) params.append("startDate", date.from.toISOString());
    if (date?.to) params.append("endDate", date.to.toISOString());
    return `/api/stats?${params.toString()}`;
  }, [date]);

  const { data, error, isLoading } = useSWR(swrUrl, fetchStats);

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingScreen message="Loading overview metrics..." />;
  }

  const { totalUsers, scans, recentActivity } = data;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Overview</h1>
          <p className="text-sm text-zinc-400 mt-1">
            A summary of your platform&apos;s activity and engagement.
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-zinc-900/50 p-2 border border-zinc-800 rounded-xl">
          <DatePickerWithRange date={date} setDate={setDate} />
          {date && (
            <button
              onClick={() => setDate(defaultValue)}
              className="text-[10px] uppercase font-bold text-zinc-500 hover:text-primary transition-colors pr-2 pb-1 sm:pb-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{totalUsers}</div>
          </CardContent>
        </Card>

        {/* Total Stamps */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Stamps
            </CardTitle>
            <QrCode className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{scans.total}</div>
          </CardContent>
        </Card>

        {/* Approved Scans / Coffees Earned */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Approved
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{scans.approved}</div>
          </CardContent>
        </Card>

        {/* Pending Scans */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Pending
            </CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{scans.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Recent Activity
      </h2>
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm col-span-1">
          <CardContent className="p-0">
            {recentActivity.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <Coffee className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {activity.username || "Guest User"}
                        </p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {activity.timestamp ? formatDate(activity.timestamp) : "Recently"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center gap-2">
                      <Badge
                        className={cn(
                          "capitalize px-2.5 py-0.5",
                          activity.status === "approved" && "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
                          activity.status === "pending" && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                          activity.status === "rejected" && "bg-red-500/20 text-red-500 border-red-500/30",
                        )}
                        variant="outline"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">
                No recent activity found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}