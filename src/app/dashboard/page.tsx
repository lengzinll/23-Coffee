"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserSearch, Clock, CheckCircle, Activity, Coffee, Award, Send } from "lucide-react";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";
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


export default function DashboardOverview() {
  const defaultValue = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, []);

  const [date, setDate] = useState<DateRange | undefined>(defaultValue);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleNotifyAll = async () => {
    if (!nearlyCompleteCustomers?.length) return;
    
    setIsNotifying(true);
    try {
      const usernames = nearlyCompleteCustomers.map((c: any) => c.username);
      const res = await rpc.scan.notifyAll.$post({ json: { usernames } });
      const result = await res.json();
      if (res.ok && result?.success) {
        toast.success(`បានបញ្ជូនការជូនដំណឹងទៅកាន់ Telegram រួចរាល់`);
      } else {
        toast.error(result?.message || "បញ្ជូនការជូនដំណឹងបរាជ័យ!");
      }
    } catch (err: any) {
      toast.error(err.message || "មានកំហុសពេលកំពុងបញ្ជូនការជូនដំណឹង");
    } finally {
      setIsNotifying(false);
    }
  };

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
        មានបញ្ហាក្នុងការផ្ទុកផ្ទាំងគ្រប់គ្រង៖ {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingScreen message="កំពុងផ្ទុកទិន្នន័យសង្ខេប..." />;
  }

  const { totalUsers, stamps, recentActivity, activeCustomers, newCustomers, returningCustomers, isDateFiltered, topCustomers, nearlyCompleteCustomers, cycleLength } = data;

  return (
    <div className="space-y-8 pb-20">
      {nearlyCompleteCustomers?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start sm:items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-500 font-bold text-sm sm:text-base">
              ជូនដំណឹង៖ អតិថិជនរួចរាល់សម្រាប់ការទទួលរង្វាន់!
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <p className="text-zinc-400 text-xs sm:text-sm">
                អ្នកមានអតិថិជន <span className="font-bold text-zinc-200">{nearlyCompleteCustomers.length}</span> នាក់ ដែលបានប្រមូលត្រាគ្រប់ចំនួន ({cycleLength}/{cycleLength})។ ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ៖{" "}
                <span className="text-zinc-300">
                  {nearlyCompleteCustomers.map((c: any) => c.username).join(", ")}
                </span>
              </p>
              
              <button 
                onClick={handleNotifyAll}
                disabled={isNotifying}
                className="flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 border border-amber-500/30 font-bold text-xs py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className={cn("h-3.5 w-3.5", isNotifying ? "animate-pulse" : "")} />
                ផ្ញើជូនដំណឹង
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">ទិដ្ឋភាពទូទៅ</h1>
          <p className="text-sm text-zinc-400 mt-1">
            សេចក្តីសង្ខេបនៃសកម្មភាព និងការចូលរួមនៅលើប្រព័ន្ធរបស់អ្នក។
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
              លុបចេញ
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              {isDateFiltered ? "អ្នកចុះឈ្មោះថ្មី" : "អ្នកប្រើប្រាស់សរុប"}
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{totalUsers}</div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              អតិថិជនសកម្ម
            </CardTitle>
            <Activity className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{activeCustomers}</div>
            {isDateFiltered && activeCustomers > 0 && (
              <p className="text-xs text-zinc-500 mt-1">
                <span className="text-emerald-500">{newCustomers} ថ្មី</span> &middot;{" "}
                <span className="text-blue-500">{returningCustomers} វិលត្រឡប់មកវិញ</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total Stamps */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              ត្រាសរុប
            </CardTitle>
            <UserSearch className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stamps.total}</div>
          </CardContent>
        </Card>

        {/* Approved Scans / Coffees Earned */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              ត្រាដែលបានផ្តល់ជូន
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stamps.approved}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            សកម្មភាពថ្មីៗ
          </h2>
          <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
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
                            {activity.username || "អ្នកប្រើប្រាស់ទូទៅ"}
                          </p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {activity.timestamp ? formatDate(activity.timestamp) : "ថ្មីៗនេះ"}
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
                  មិនមានសកម្មភាពថ្មីៗទេ។
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Loyal Customers */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            អតិថិជន ៥ នាក់ដែលជិតទទួលបានរង្វាន់
          </h2>
          <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {topCustomers?.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {topCustomers.map((customer: any, index: number) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shrink-0 text-yellow-500 font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {customer.username}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            អតិថិជនស្មោះត្រង់
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-2.5 py-0.5" title={`សរុប៖ ${customer.stamps} ត្រា`}>
                          {customer.remainder}/{cycleLength} ត្រា
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                  រកមិនឃើញអតិថិជនកំពូលទេ។
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}