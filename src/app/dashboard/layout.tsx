"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ClipboardList,
  QrCode,
  LogOut,
  Calendar,
  MapPin,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MouseGlow } from "@/components/mouse-glow";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = [
    { href: "/dashboard", label: "Overview", icon: ClipboardList },
    { href: "/dashboard/events", label: "Manage Events", icon: Calendar },
    { href: "/dashboard/locations", label: "Locations", icon: MapPin },
    { href: "/dashboard/challenges", label: "Challenges", icon: Trophy },
    {
      href: "/dashboard/registrations",
      label: "Registrations",
      icon: ClipboardList,
    },
    { href: "/dashboard/users", label: "System Users", icon: Users },
    { href: "/dashboard/scanner", label: "QR Scanner", icon: QrCode },
  ];

  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await rpc.auth.logout.$post();
      if (res.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      <MouseGlow />
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <div className="ml-4 mt-5 mb-5 relative w-45 h-19 overflow-hidden">
          <Image
            src="/nextplay_logo.png"
            alt="Next Play Live"
            fill
            className="object-contain scale-[1.8] drop-shadow-[0_0_15px_rgba(255,8,8,0.2)]"
            priority
          />
        </div>
        <nav className="space-y-2 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            const normalizedPathname =
              pathname.endsWith("/") && pathname !== "/"
                ? pathname.slice(0, -1)
                : pathname;
            const isActive = normalizedPathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-zinc-800 text-primary font-medium"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50",
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-zinc-800">
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full cursor-pointer justify-start gap-3 px-3 py-2.5 text-sm text-primary hover:text-primary/90 hover:bg-primary/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-72 p-4 space-y-4  bg-primary/10 border border-primary/30 text-white">
                <div className="space-y-1">
                  <h4 className="font-medium text-primary">Log out?</h4>
                  <p className="text-sm">
                    You’ll need to sign in again to access the dashboard.
                  </p>
                </div>

                <div className="flex  justify-end gap-3">
                  <Button
                    className="cursor-pointer bg-primary"
                    variant="destructive"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Log Out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
