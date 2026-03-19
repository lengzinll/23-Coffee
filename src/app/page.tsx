import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList, QrCode, ShieldCheck, Users } from "lucide-react";
import { MouseGlow } from "@/components/mouse-glow";
import { db } from "@/db";
import { register } from "@/db/schema";
import { sql } from "drizzle-orm";
import { CountUp } from "@/components/count-up";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTotalRegistrations(): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(register)
      .get();
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

export default async function Home() {
  const totalRegistrations = await getTotalRegistrations();

  return (
    <div className="relative min-h-screen  text-primary-foreground flex flex-col items-center justify-center p-4 overflow-hidden">
      <MouseGlow />
      <div className="relative z-10 w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-6 flex flex-col items-center">
          <div className="relative mb-[-30px] w-[340px] h-[180px] sm:w-[600px] sm:h-[300px] animate-in fade-in zoom-in duration-1000">
            <Image
              src="/nextplay_logo.png"
              alt="Next Play Live"
              fill
              className="object-contain drop-shadow-[0_0_25px_rgba(255,8,8,0.3)] brightness-110 contrast-110"
              priority
            />
          </div>
          <p className="text-xl text-primary-foreground max-w-2xl mx-auto">
            មកចុះឈ្មោះ
            និងបញ្ជាក់អត្តសញ្ញាណរបស់អ្នកតាមរយៈប្រព័ន្ធដ៏ល្អឥតខ្ចោះរបស់យើង។
            សូមចូលរួម challenge ហើយប្រញាប់កក់កន្លែងជាបន្ទាន់ មុនអស់ទីតាំង! 💪🔥
          </p>
        </div>

        {/* Registration Count Banner */}
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">
              ចំនួនអ្នកចុះឈ្មោះសរុប
            </span>
            <span className="text-2xl font-bold text-white tabular-nums">
              <CountUp target={totalRegistrations} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <ClipboardList className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>ចុះឈ្មោះបានងាយស្រួល</CardTitle>
              <CardDescription className="text-zinc-400">
                បំពេញព័ត៌មានរបស់អ្នកបានយ៉ាងរហ័ស ហើយចូលរួមព្រឹត្តិការណ៍ភ្លាមៗ។
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <ShieldCheck className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>ផ្ទៀងផ្ទាត់អត្តសញ្ញាណដោយ AI</CardTitle>
              <CardDescription className="text-zinc-400">
                AI ផ្ទៀងផ្ទាត់ការបំពេញលក្ខខណ្ឌរបស់អ្នកភ្លាមៗ។
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <QrCode className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>Check-in បានរហ័ស</CardTitle>
              <CardDescription className="text-zinc-400">
                QR code ដ៏មានសុវត្ថិភាពសម្រាប់ការចូលរួមព្រឹត្តិការណ៍។
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
          >
            <Link href="/form">ចុះឈ្មោះចូលរួម</Link>
          </Button>
        </div>
      </div>

      <footer className="mt-10 text-primary-foreground text-sm">
        &copy; {new Date().getFullYear()} Next Play Live. រក្សាសិទ្ធិគ្រប់យ៉ាង។
      </footer>
    </div>
  );
}
