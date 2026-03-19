"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWRMutation from "swr/mutation";

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
    throw new Error(body.message || "Invalid username or password");
  }

  return body;
}

export default function LoginPage() {
  const router = useRouter();

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

      <div className="mb-10 flex flex-col items-center">
        <div className="relative w-76 h-44 mb-[-25px]">
          <Image
            src="/nextplay_logo.png"
            alt="Next Play Live"
            fill
            className="object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] brightness-110 contrast-110"
            priority
          />
        </div>
        <div className="h-px w-12 bg-primary/30 mb-3" />
        <p className="text-[10px] text-primary-foreground  uppercase tracking-[0.3em] font-black opacity-80">
          Admin Dashboard
        </p>
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-sm border-zinc-800/50 shadow-2xl shadow-black/40">
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Sign In
          </CardTitle>
          <CardDescription className="text-primary-foreground">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-200">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin or your username"
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
                Password
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
              {isMutating ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:text-zinc-200 hover:bg-zinc-800/40"
              onClick={() => router.push("/")}
              disabled={isMutating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-primary-foreground">
        © {new Date().getFullYear()} Next Play Live • Admin Access Only
      </p>
    </div>
  );
}
