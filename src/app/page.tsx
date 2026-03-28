import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList, Users, ShieldCheck, UserSearch } from "lucide-react";
import { MouseGlow } from "@/components/mouse-glow";
import { db } from "@/db";
import { scanHistory } from "@/db/schema";
import { sql } from "drizzle-orm";
import { CountUp } from "@/components/count-up";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTotalStamps(): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(scanHistory)
      .get();
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

export default async function Home() {
  const totalStamps = await getTotalStamps();

  return (
    <div className="relative min-h-screen  text-primary-foreground flex flex-col items-center justify-center p-4 overflow-hidden">
      <MouseGlow />
      <div className="relative z-10 w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-6 flex flex-col items-center">
          <div className="relative mb-2 w-[340px] h-[180px] sm:w-[500px] sm:h-[250px] animate-in fade-in zoom-in duration-1000">
            <Image
              src="/23_coffee.png"
              alt="Next Play Live"
              fill
              className="object-contain drop-shadow-[0_0_25px_rgba(160,90,50,0.4)] brightness-110 contrast-110"
              priority
            />
          </div>
          <p className="text-xl text-primary-foreground max-w-2xl mx-auto">
            មកចុះឈ្មោះសន្សំត្រាឌីជីថលជាមួយ 23 Coffee
            ដើម្បីទទួលបានភេសជ្ជៈឥតគិតថ្លៃ និងការផ្តល់ជូនពិសេសៗ!
            រាល់ការជាវភេសជ្ជៈ គឺជាការសន្សំពិន្ទុឆ្ពោះទៅរករង្វាន់ដ៏អស្ចារ្យ។ ☕️✨
          </p>
        </div>

        {/* Registration Count Banner */}
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">
              ចំនួនត្រាសរុប (Total Stamps)
            </span>
            <span className="text-2xl font-bold text-white tabular-nums">
              <CountUp target={totalStamps} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <ClipboardList className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>សន្សំត្រាងាយស្រួល</CardTitle>
              <CardDescription className="text-zinc-400">
                គ្រាន់តែប្រាប់ឈ្មោះរបស់អ្នកទៅកាន់បុគ្គលិក
                ដើម្បីសន្សំត្រាបានយ៉ាងរហ័ស។
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <ShieldCheck className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>ប្តូររង្វាន់ភ្លាមៗ</CardTitle>
              <CardDescription className="text-zinc-400">
                នៅពេលសន្សំគ្រប់ចំនួន អ្នកអាចប្តូរយកភេសជ្ជៈឥតគិតថ្លៃបានយ៉ាងរហ័ស។
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader>
              <UserSearch className="w-10 h-10 text-primary mb-2 mx-auto" />
              <CardTitle>ពិនិត្យស្ថានភាពត្រា</CardTitle>
              <CardDescription className="text-zinc-400">
                តាមដានចំនួនត្រាដែលអ្នកសន្សំបានគ្រប់ពេលវេលា
                តាមរយៈទូរស័ព្ទដៃរបស់អ្នក។
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
            <Link href="/register">ចុះឈ្មោះចូលរួម</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
          >
            <Link href="/login">ចូលគណនី</Link>
          </Button>
        </div>
      </div>

      <footer className="mt-10 text-primary-foreground text-sm">
        Copyright &copy; {new Date().getFullYear()} NSM Technology Co., LTD. All
        Rights Reserved.
      </footer>
    </div>
  );
}
