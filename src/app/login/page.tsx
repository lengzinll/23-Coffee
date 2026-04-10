"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import { rpc } from "@/lib/rpc";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { MouseGlow } from "@/components/mouse-glow";

async function loginFetcher(
  _key: string,
  { arg }: { arg: { username: string; password: string } },
) {
  const res = await rpc.auth.login.$post({ json: arg });
  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message || "ឈ្មោះអ្នកប្រើប្រាស់ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
  }

  return body;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>កំពុងផ្ទុក...</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const {
    trigger,
    isMutating,
    error: mutationError,
  } = useSWRMutation("/api/auth/login", loginFetcher, {
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await trigger({ username, password });
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong");
    }
  };

  const displayError = formError || (mutationError?.message ?? "");

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 via-zinc-950 to-zinc-900 flex flex-col items-center justify-center p-6">
      <MouseGlow />

      {isRegistered && (
        <div className="mb-6 w-full max-w-md rounded-md bg-emerald-950/40 border border-emerald-800/50 p-4 text-center text-sm text-emerald-400 animate-in fade-in slide-in-from-top-4 duration-500">
          បានបង្កើតគណនីដោយជោគជ័យ! លោកអ្នកអាចចូលគណនីបានឥឡូវនេះ។
        </div>
      )}

      <div className="mb-10 flex flex-col items-center">
        <div className="relative w-80 h-44 mb-2">
          <Image
            src="/23_coffee.png"
            alt="Next Play Live"
            fill
            className="object-contain drop-shadow-[0_0_15px_rgba(160,90,50,0.4)] brightness-110 contrast-110"
            priority
          />
        </div>
        <div className="h-px w-12 bg-primary/30 mb-3" />
        <p className="text-[10px] text-primary-foreground  uppercase tracking-[0.3em] font-black opacity-80">
          ផ្ទាំងគ្រប់គ្រង
        </p>
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-sm border-zinc-800/50 shadow-2xl shadow-black/40">
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            ចូលគណនី
          </CardTitle>
          <CardDescription className="text-primary-foreground">
            បញ្ចូលព័ត៌មានលម្អិតរបស់អ្នកដើម្បីចូលផ្ទាំងគ្រប់គ្រង
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-200">
                ឈ្មោះអ្នកប្រើប្រាស់
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="អ្នកគ្រប់គ្រង ឬ ឈ្មោះអ្នកប្រើប្រាស់របស់អ្នក"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-primary/50 focus-visible:border-primary/40 transition-colors"
                required
                autoFocus
                disabled={isMutating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">
                ពាក្យសម្ងាត់
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-primary/50 focus-visible:border-primary/40 transition-colors"
                required
                disabled={isMutating}
              />
            </div>

            {displayError && (
              <div className="rounded-md bg-red-950/40 border border-red-800/50 p-3 text-sm text-primary">
                {displayError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium transition-all duration-200 shadow-lg shadow-primary/30"
              disabled={isMutating}
              size="lg"
            >
              {isMutating ? "កំពុងចូលគណនី..." : "ចូលគណនី"}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-zinc-400">
              មិនទាន់មានគណនីមែនទេ?{" "}
              <Link href="/register" className="text-primary hover:underline">
                ចុះឈ្មោះ
              </Link>
            </p>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary-foreground hover:text-zinc-200 hover:bg-zinc-800/40"
              disabled={isMutating}
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                ត្រឡប់ទៅទំព័រដើម
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-primary-foreground">
        © {new Date().getFullYear()} Next Play Live • សម្រាប់តែអ្នកគ្រប់គ្រងប៉ុណ្ណោះ
      </p>
    </div>
  );
}
