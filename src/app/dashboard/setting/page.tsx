"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { rpc } from "@/lib/rpc";
import { 
  Settings, 
  Bell, 
  Send, 
  ShieldCheck, 
  Check, 
  Zap,
  Info,
  Clock
} from "lucide-react";

/**
 * SettingsPage - Minimalist Dark Dashboard.
 * Optimized for high legibility in Dark Mode.
 */
const fetcher = async () => {
  const res = await rpc.settings.$get();
  if (!res.ok) throw new Error("Failed to fetch settings");
  const result = await res.json();
  return result.data;
};

export default function SettingsPage() {
  const { data: settings, isLoading, mutate } = useSWR("/api/settings", fetcher);
  
  const [stampsPerCycle, setStampsPerCycle] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [morningTime, setMorningTime] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setStampsPerCycle(settings["STAMPS_PER_CYCLE"] || "6");
      setBotToken(settings["TELEGRAM_BOT_TOKEN"] || "");
      setChatId(settings["TELEGRAM_CHAT_ID"] || "");
      setMorningTime(settings["NOTIFICATION_TIME"] || "07:00");
      setReportTime(settings["REPORT_TIME"] || "21:00");
    }
  }, [settings]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: "STAMPS_PER_CYCLE", value: stampsPerCycle },
        { key: "TELEGRAM_BOT_TOKEN", value: botToken },
        { key: "TELEGRAM_CHAT_ID", value: chatId },
        { key: "NOTIFICATION_TIME", value: morningTime },
        { key: "REPORT_TIME", value: reportTime },
      ];

      for (const update of updates) {
        await rpc.settings.$post({ json: update });
      }

      toast.success("រក្សាទុកជោគជ័យ", { icon: <Check className="w-4 h-4" /> });
      mutate();
    } catch (error) {
      toast.error("កំហុសក្នុងការរក្សាទុក");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBot = async () => {
    setIsTesting(true);
    try {
      const res = await rpc.settings.test.$post();
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("សារសាកល្បងបានផ្ញើទៅ Telegram", { icon: <Send className="w-4 h-4" /> });
      } else {
        toast.error(result.message || "តេស្តបរាជ័យ");
      }
    } catch (error) {
      toast.error("កំហុសក្នុងការតភ្ជាប់");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) return <LoadingScreen message="កំពុងរៀបចំ..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      {/* Header section with high-contrast text */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-8 pt-4">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-zinc-400" />
                ការកំណត់ (Settings)
            </h1>
            <p className="text-zinc-400 text-sm">គ្រប់គ្រងគ្រឹះស្ថានប្រព័ន្ធ និងស្វ័យប្រវត្តិកម្ម។</p>
        </div>
        <Button 
          onClick={handleSaveAll} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-lg shadow-lg active:scale-95 transition-all"
        >
          {isSaving ? "រក្សាទុក..." : "រក្សាទុកការកំណត់"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Operation Settings */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 bg-zinc-800/20 py-4">
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2 tracking-wide uppercase">
                    <Zap className="w-4 h-4 text-orange-400" />
                    ប្រព័ន្ធប្រតិបត្តិការ
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              {/* Reward Cycle Input */}
              <div className="space-y-3">
                <Label className="text-zinc-300 text-sm font-medium">ចំនួនត្រាតម្រូវសម្រាប់រង្វាន់ (Stamp Cycle)</Label>
                <div className="relative group">
                    <Input 
                      type="number"
                      min="1"
                      value={stampsPerCycle}
                      onChange={(e) => setStampsPerCycle(e.target.value)}
                      className="h-12 bg-zinc-950 border-zinc-800 focus:ring-primary/20 text-lg font-mono pl-4 text-zinc-100"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-primary transition-colors italic text-xs">
                        Stamps
                    </div>
                </div>
              </div>

              {/* Time Schedulers with brighter labels */}
              <div className="grid sm:grid-cols-2 gap-8 pt-4 border-t border-zinc-800/50">
                <div className="space-y-3">
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        ម៉ោងជូនដំណឹង (ព្រឹក)
                    </Label>
                    <Input 
                        type="time"
                        value={morningTime}
                        onChange={(e) => setMorningTime(e.target.value)}
                        className="h-11 bg-zinc-950 border-zinc-800 focus:ring-primary/20 text-zinc-100"
                    />
                </div>
                <div className="space-y-3">
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                        <Bell className="w-3 h-3 text-zinc-500" />
                        ម៉ោងជូនដំណឹង (យប់)
                    </Label>
                    <Input 
                        type="time"
                        value={reportTime}
                        onChange={(e) => setReportTime(e.target.value)}
                        className="h-11 bg-zinc-950 border-zinc-800 focus:ring-primary/20 text-zinc-100"
                    />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Banner with brighter text */}
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 flex items-start gap-3 rounded-xl">
             <div className="p-2 bg-orange-500/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
             </div>
             <div>
                <h4 className="text-xs font-bold text-zinc-200">សុវត្ថិភាពទិន្នន័យ (Data Security)</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                    រាល់ការផ្លាស់ប្តូរត្រូវបានការពារ និងបញ្ចូលដោយស្វ័យប្រវត្តិទៅក្នុងមូលដ្ឋានទិន្នន័យដែលមានសុវត្ថិភាព។
                </p>
             </div>
          </div>
        </div>

        {/* Right Column: Telegram Settings & Health */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800 shadow-md">
            <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/30">
                <CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2 tracking-wide uppercase">
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    Telegram Bot Auth
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-tight">Bot API Token</Label>
                <Input 
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="8769481063:AAH..."
                  className="bg-zinc-900 border-zinc-800 focus:ring-blue-500/20 text-xs font-mono text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-tight">Chat ID</Label>
                <Input 
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-100..."
                  className="bg-zinc-900 border-zinc-800 focus:ring-blue-500/20 text-xs font-mono text-zinc-100"
                />
              </div>

            </CardContent>
          </Card>

          {/* Engine Status Grid with legible labels */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-tighter text-zinc-400">Scheduler</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <div className="text-zinc-100 text-xs font-bold font-mono tracking-tight">Active</div>
             </div>
             <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-tighter text-zinc-400">Reporting</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="text-zinc-100 text-xs font-bold font-mono tracking-tight">Healthy</div>
             </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
             <Info className="w-3.5 h-3.5 text-zinc-400" />
             <span className="text-[10px] text-zinc-400 leading-tight">
                ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពភ្លាមៗបន្ទាប់ពីអ្នករក្សាទុក។
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}