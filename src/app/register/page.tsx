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
import Link from "next/link";

async function registerFetcher(
    _key: string,
    { arg }: { arg: { username: string; password: string } },
) {
    const res = await rpc.auth.register.$post({ json: arg });
    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message || "Something went wrong");
    }

    return body;
}

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [formError, setFormError] = useState("");

    const {
        trigger,
        isMutating,
        error: mutationError,
    } = useSWRMutation("/api/auth/register", registerFetcher, {
        onSuccess: () => {
            router.push("/login?registered=true");
        },
        onError: (err) => {
            console.error(err);
        },
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (password !== confirmPassword) {
            setFormError("Passwords do not match");
            return;
        }

        if (username.length < 3) {
            setFormError("Username must be at least 3 characters");
            return;
        }

        if (password.length < 6) {
            setFormError("Password must be at least 6 characters");
            return;
        }

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
                <div className="relative w-80 h-44 mb-2">
                    <Image
                        src="/23_coffee.png"
                        alt="23 Coffee"
                        fill
                        className="object-contain drop-shadow-[0_0_15px_rgba(160,90,50,0.4)] brightness-110 contrast-110"
                        priority
                    />
                </div>
                <div className="h-px w-12 bg-primary/30 mb-3" />
                <p className="text-[10px] text-primary-foreground  uppercase tracking-[0.3em] font-black opacity-80">
                    User Registration
                </p>
            </div>

            <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-sm border-zinc-800/50 shadow-2xl shadow-black/40">
                <CardHeader className="space-y-1 pb-6 text-center">
                    <CardTitle className="text-2xl font-bold text-primary">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-primary-foreground">
                        Enter your details to register for the platform
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-200">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Choose a username"
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-zinc-200">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium transition-all duration-200 shadow-lg shadow-primary/30 mt-2"
                            disabled={isMutating}
                            size="lg"
                        >
                            {isMutating ? "Creating Account..." : "Sign Up"}
                        </Button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-zinc-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-primary hover:underline">
                                Sign In
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
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <p className="mt-8 text-xs text-primary-foreground">
                © {new Date().getFullYear()} Next Play Live • Start Your Journey
            </p>
        </div>
    );
}
