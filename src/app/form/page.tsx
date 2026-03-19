"use client";
import imageCompression from "browser-image-compression";

import { useState, useRef, useEffect } from "react";
import NextImage from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "react-qr-code";
import useSWRMutation from "swr/mutation";
import { rpc } from "@/lib/rpc";
import { toPng } from "html-to-image";

import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegisterSchema, registerSchema } from "@/lib/validations";
import { type ApiSocialMediaTask, type RegisterError } from "@/lib/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  Facebook,
  Send,
  Music2,
  Youtube,
  Loader2,
  Link as LinkIcon,
  Download,
  X,
  CheckCircle2,
  CalendarDays,
  MapPin,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ── localStorage key & helpers ──────────────────────────────────────────────
const LS_KEY = "npl_registrations"; // map: eventId → registrationId

type RegistrationMap = Record<string, string>; // key = eventId.toString()

function saveRegistration(registrationId: string, eventId: number) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map: RegistrationMap = raw ? JSON.parse(raw) : {};
    map[eventId.toString()] = registrationId;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {}
}

function loadRegistrationForEvent(eventId: number): string | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const map: RegistrationMap = JSON.parse(raw);
    return map[eventId.toString()] ?? null;
  } catch {
    return null;
  }
}

function clearRegistrationForEvent(eventId: number) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const map: RegistrationMap = JSON.parse(raw);
    delete map[eventId.toString()];
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {}
}

// ── image helpers ────────────────────────────────────────────────────────────
const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    initialQuality: 0.7,
    fileType: file.type as string,
  };
  try {
    return await imageCompression(file, options);
  } catch {
    return file;
  }
};

const uploadFile = async (file: File): Promise<string> => {
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("file", compressed, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
};

async function registerFetcher(_url: string, { arg }: { arg: RegisterSchema }) {
  const res = await rpc.register.$post({ json: arg });
  const body = (await res.json()) as unknown as {
    message: string;
    data?: { id: number; playerId: string | null };
    taskErrors?: Record<string, string>;
  };
  if (!res.ok) {
    const err = new Error(body.message) as RegisterError;
    err.taskErrors = body.taskErrors ?? undefined;
    throw err;
  }
  return body;
}

// ── QR View (shown when already registered for current event) ───────────────
function RegisteredView({
  registrationId,
  eventId,
  eventName,
  locationName,
  locationMapUrl,
  profileImage,
  fullName,
  phone,
  position,
  playerId,
  onReset,
}: {
  registrationId: string;
  eventId: number;
  eventName: string | null;
  locationName: string | null;
  locationMapUrl: string | null;
  profileImage: string | null;
  fullName: string | null;
  phone: string | null;
  position: string | null;
  playerId: string | null;
  onReset: () => void;
}) {
  const { data: regInfo } = useSWR(
    registrationId ? `reg-detail-${registrationId}` : null,
    async () => {
      const res = await rpc.register[":id"].$get({
        param: { id: registrationId },
      });
      return await res.json();
    },
  );

  const regDetail = regInfo && "data" in regInfo ? regInfo.data : null;

  const displayFullName = fullName || regDetail?.fullName || null;
  const displayPhone = phone || regDetail?.phone || null;
  const displayPosition = position || regDetail?.position || null;
  const displayProfileImage = profileImage || regDetail?.profileImage || null;
  const displayPlayerId = playerId || regDetail?.playerId || null;

  const cardRef = useRef<HTMLDivElement>(null);
  const notchRef = useRef<HTMLDivElement>(null);
  const [notchY, setNotchY] = useState(352);

  useEffect(() => {
    if (notchRef.current) {
      setNotchY(notchRef.current.offsetTop + notchRef.current.offsetHeight / 2);
    }
  }, [regDetail]);

  const downloadCard = async () => {
    if (!cardRef.current) {
      toast.error("Could not find card to download");
      return;
    }

    const toastId = toast.loading("Preparing your ticket...");
    const disabledSheets: (HTMLLinkElement | HTMLStyleElement)[] = [];
    const styleSheets = Array.from(document.styleSheets);

    for (const sheet of styleSheets) {
      try {
        // Try accessing rules to test if it's accessible
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const rules = sheet.cssRules;
      } catch (e) {
        // If it throws SecurityError, it's cross-origin and doesn't allow CORS
        const ownerNode = sheet.ownerNode;
        if (
          ownerNode instanceof HTMLLinkElement ||
          ownerNode instanceof HTMLStyleElement
        ) {
          try {
            // Check if it's already disabled or if we can handle it
            if (!sheet.disabled) {
              sheet.disabled = true;
              disabledSheets.push(ownerNode);
            }
          } catch (err) {
            console.warn("Could not disable problematic stylesheet", err);
          }
        }
      }
    }

    try {
      // Small delay to ensure everything is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      const options = {
        quality: 1.0,
        pixelRatio: 4,
        cacheBust: true,
        style: {
          transform: "scale(1)",
        },
        // Filter out nodes that might trigger cross-origin requests
        filter: (node: HTMLElement) => {
          if (
            node.tagName === "LINK" &&
            (node as HTMLLinkElement).rel === "stylesheet"
          ) {
            return false; // Skip stylesheets in the node tree itself
          }
          return true;
        },
      };

      let dataUrl: string;
      try {
        dataUrl = await toPng(cardRef.current, options);
      } catch (err: unknown) {
        // 🧪 Ultimate Fallback: if scanning still fails, retry without font embedding
        if (
          err instanceof Error &&
          (err.message?.includes("cssRules") ||
            err.toString().includes("SecurityError"))
        ) {
          console.warn("Retrying without font embedding", err);
          dataUrl = await toPng(cardRef.current, {
            ...options,
            fontEmbedCSS: "",
          });
        } else {
          throw err;
        }
      }

      const link = document.createElement("a");
      link.download = `next-play-card-${registrationId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Ticket downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download ticket", { id: toastId });
    } finally {
      // 🔄 Restore disabled stylesheets
      for (const node of disabledSheets) {
        try {
          if (node.sheet) node.sheet.disabled = false;
        } catch (e) {}
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Download notice — above the card */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Download className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-primary text-center">
            ចុចប៊ូតុងខាងក្រោម ដើម្បីទាញយក Ticket!
          </h3>
          <Download className="w-4 h-4 text-primary" />
        </div>

        {/* Professional Ticket Pass */}
        <div
          ref={cardRef}
          style={{
            backgroundColor: "#ff0808",
            WebkitMaskImage: `radial-gradient(circle at 0 ${notchY}px, transparent 16px, black 17px), radial-gradient(circle at 100% ${notchY}px, transparent 16px, black 17px)`,
            WebkitMaskComposite: "source-in",
            maskImage: `radial-gradient(circle at 0 ${notchY}px, transparent 16px, black 17px), radial-gradient(circle at 100% ${notchY}px, transparent 16px, black 17px)`,
            maskComposite: "intersect",
          }}
          className="relative text-white rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          {/* Top Section: Info */}
          <div className="p-8 pb-6">
            <div className="flex gap-6 mb-8">
              {/* Profile Image (Rounded Square) */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 shrink-0 border border-white/20 relative">
                {displayProfileImage ? (
                  <NextImage
                    src={displayProfileImage}
                    alt="Member Profile"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 text-3xl font-bold">
                    {displayFullName?.charAt(0) || "👤"}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-white leading-tight mb-2 uppercase wrap-break-word">
                  {eventName || "Next Play Event"}
                </h1>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                    MEMBER NAME
                  </p>
                  <p className="font-bold text-white truncate text-xl">
                    {displayFullName || "Guest Player"}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            {/* Info Grid - 4 Columns/Fields as requested */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                  DATE
                </p>
                <p className="font-black text-[13px] text-white">
                  {regDetail?.eventDate
                    ? new Date(regDetail.eventDate).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : new Date().toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                  TIME
                </p>
                <p className="font-black text-[13px] text-white">
                  {regDetail?.eventDate
                    ? new Date(regDetail.eventDate).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        },
                      )
                    : "03:00 PM"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                  POSITION
                </p>
                <p className="font-black text-[13px] text-white uppercase truncate">
                  {displayPosition || "Player"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                  CONTACT/VENUE
                </p>
                <p className="font-black text-[13px] text-white truncate">
                  {displayPhone || "No Phone"}
                </p>
              </div>
            </div>
          </div>

          {/* Tear-off Line (Dashed divider with circular side cutouts) */}
          <div ref={notchRef} className="relative flex items-center px-6 h-8">
            {/* Divider Line */}
            <div className="flex-1 border-t-4 border-dashed border-white/50" />
          </div>

          {/* Bottom Section: QR */}
          <div className="p-8 pt-4 flex flex-col items-center">
            <div className="bg-white p-4 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.1)] border border-primary/5 relative group transition-all">
              <QRCode value={registrationId} size={220} level="H" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1 rounded-lg">
                  <NextImage
                    src="/black-logo.png"
                    alt="Logo"
                    width={32}
                    height={32}
                  />
                </div>
              </div>
            </div>
            {displayPlayerId && (
              <div className="mt-8 text-center">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mb-1">
                  PLAYER ID
                </p>
                <p className="text-white font-mono font-black tracking-tighter text-xl">
                  {displayPlayerId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Outer Actions */}
        <div className="space-y-4 pt-2">
          <button
            onClick={downloadCard}
            className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-black text-lg uppercase tracking-tight rounded-[1.5rem] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            Download Ticket
          </button>

          {locationMapUrl && (
            <a
              href={locationMapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-2 text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-bold tracking-widest transition-colors"
            >
              <MapPin className="w-3 h-3" />
              View Event Location Details
            </a>
          )}
        </div>

        {/* <button
          type="button"
          onClick={() => {
            clearRegistrationForEvent(eventId);
            onReset();
          }}
          className="w-full text-center text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors uppercase tracking-[0.2em] font-bold py-4"
        >
          Reset Registration Session
        </button> */}
      </div>
    </div>
  );
}

// ── Main Form Page ────────────────────────────────────────────────────────────
export default function RegisterForm() {
  const router = useRouter();
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [registeredPlayerId, setRegisteredPlayerId] = useState<string | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  const { trigger, isMutating } = useSWRMutation("register", registerFetcher);

  const { data: activeEvent } = useSWR("/api/event/active", async () => {
    const res = await rpc.event.active.$get();
    const json = await res.json();
    return json.data;
  });

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks } = useSWR(
    "active-tasks",
    async () => {
      const res = await rpc.event.active.tasks.$get();
      const json = await res.json();
      return json.data;
    },
  );

  // Background verification of existing registration (to clear LS if deleted from DB)
  const { error: regError } = useSWR(
    hydrated && registrationId ? `verify-reg-${registrationId}` : null,
    async () => {
      const res = await rpc.register[":id"].$get({
        param: { id: registrationId! },
      });
      if (res.status === 404) {
        const error = new Error("Not Found");
        (error as any).status = 404;
        throw error;
      }
      return true;
    },
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      refreshInterval: 5000,
    },
  );

  // Effect to clean up LocalStorage if registration is missing on server
  useEffect(() => {
    if (regError && (regError as any).status === 404 && activeEvent?.id) {
      clearRegistrationForEvent(activeEvent.id);
      setRegistrationId(null);
    }
  }, [regError, activeEvent]);

  // ── On mount / activeEvent change: load from LS ──
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && activeEvent?.id) {
      const id = loadRegistrationForEvent(activeEvent.id);
      setRegistrationId(id);
    }
  }, [hydrated, activeEvent]);

  const [socialProofs, setSocialProofs] = useState<Record<string, string>>({});
  const [proofErrors, setProofErrors] = useState<Record<string, string>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>(
    {},
  );
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tasksSectionRef = useRef<HTMLDivElement>(null);

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      age: "",
      phone: "",
      agreedTerms: false,
      position: "",
      profileImage: "",
    },
  });

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = async (file: File) => {
    setIsUploadingProfile(true);
    try {
      const url = await uploadFile(file);
      form.setValue("profileImage", url);
      toast.success("Profile image uploaded");
    } catch (error) {
      toast.error("Profile image upload failed");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleProofUpload = async (taskId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews((prev) => ({ ...prev, [taskId]: objectUrl }));
    try {
      const url = await uploadFile(file);
      setSocialProofs((prev) => ({ ...prev, [taskId]: url }));
      setLocalPreviews((prev) => ({ ...prev, [taskId]: url }));
      URL.revokeObjectURL(objectUrl);
      return url;
    } catch (error) {
      setLocalPreviews((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      URL.revokeObjectURL(objectUrl);
      toast.error("Upload failed");
      throw error;
    }
  };

  const onSubmit: SubmitHandler<RegisterSchema> = async (values) => {
    if (tasks && tasks.length > 0) {
      const errors: Record<string, string> = {};
      tasks.forEach((task: ApiSocialMediaTask) => {
        if (!socialProofs[task.id.toString()]) {
          errors[task.id.toString()] =
            "សូមផ្តល់ Screenshot សម្រាប់ផ្ទៀងផ្ទាត់ការងារនេះ។";
        }
      });
      if (Object.keys(errors).length > 0) {
        setProofErrors(errors);
        toast.error("⚠️ សូមមេត្តាអានការណែនាំ និង Upload រូបភាព!", {
          duration: 5000,
          position: "top-center",
        });
        tasksSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
    }
    setProofErrors({});

    trigger(
      { ...values, socialProofs: JSON.stringify(socialProofs) },
      {
        onSuccess: (response) => {
          const regId = response.data?.id.toString() ?? null;
          const pId = response.data?.playerId ?? null;
          setQrCodeData(regId);
          setRegisteredPlayerId(pId);
          // Persist registration so user sees QR next visit
          if (regId && activeEvent?.id) {
            saveRegistration(regId, activeEvent.id);
            setRegistrationId(regId);
          }
          form.reset();
          setSocialProofs({});
          setLocalPreviews({});
          setProofErrors({});
          form.setValue("profileImage", "");
          Object.values(fileInputRefs.current).forEach((input) => {
            if (input) input.value = "";
          });
          if (profileInputRef.current) profileInputRef.current.value = "";
        },
        onError: (err: RegisterError) => {
          if (err?.taskErrors && typeof err.taskErrors === "object") {
            setProofErrors((prev) => ({ ...prev, ...err.taskErrors }));
          }
          if (err.message?.includes("លេខទូរស័ព្ទ")) {
            form.setError("phone", { type: "manual", message: err.message });
          }
          toast.error(err.message);
        },
      },
    );
  };

  const downloadQRCode = () => {
    const svg = document.querySelector("#registration-qr svg") as SVGElement;
    if (!svg) {
      toast.error("Could not find QR code to download");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const canvas = document.createElement("canvas");
    const SIZE = 912;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    const qrImg = new Image();
    qrImg.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      const PADDING = 32;
      const QR_SIZE = SIZE - PADDING * 2;
      ctx?.drawImage(qrImg, PADDING, PADDING, QR_SIZE, QR_SIZE);
      URL.revokeObjectURL(blobUrl);
      const logoImg = new Image();
      const LOGO_SIZE = Math.round(QR_SIZE * 0.25);
      const logoX = (SIZE - LOGO_SIZE) / 2;
      const logoY = (SIZE - LOGO_SIZE) / 2;
      logoImg.onload = () => {
        if (ctx) {
          const PAD = 4;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(
            logoX - PAD,
            logoY - PAD,
            LOGO_SIZE + PAD * 2,
            LOGO_SIZE + PAD * 2,
          );
          ctx.drawImage(logoImg, logoX, logoY, LOGO_SIZE, LOGO_SIZE);
        }
        const link = document.createElement("a");
        link.download = `next-play-qr-${qrCodeData}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR Code downloaded!");
      };
      logoImg.onerror = () => {
        const link = document.createElement("a");
        link.download = `next-play-qr-${qrCodeData}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR Code downloaded!");
      };
      logoImg.src = "/black-logo.png";
    };
    qrImg.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      toast.error("Failed to generate QR image");
    };
    qrImg.src = blobUrl;
  };

  // ── Guard: show loading until localStorage is read ──────────────────────
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (registrationId && activeEvent) {
    return (
      <RegisteredView
        registrationId={registrationId}
        eventId={activeEvent.id}
        eventName={activeEvent.name ?? null}
        locationName={activeEvent.locationName ?? null}
        locationMapUrl={activeEvent.locationMapUrl ?? null}
        profileImage={form.getValues("profileImage") || null}
        fullName={form.getValues("fullName") || null}
        phone={form.getValues("phone") || null}
        position={form.getValues("position") || null}
        playerId={registeredPlayerId}
        onReset={() => {
          setRegistrationId(null);
          setRegisteredPlayerId(null);
        }}
      />
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="pt-0">
          <div className="flex flex-col items-center">
            <div className="relative w-72 h-36 -mt-8 -mb-4">
              <NextImage
                src="/nextplay_logo.png"
                alt="Next Play Live"
                fill
                className="object-contain scale-110 drop-shadow-[0_0_15px_rgba(255,8,8,0.2)]"
                priority
              />
            </div>
            <div className="flex flex-col items-center gap-1 -mt-2">
              {activeEvent && (
                <>
                  <span className="text-primary font-bold text-lg uppercase tracking-wider">
                    {activeEvent.name}
                  </span>
                  {activeEvent.locationName && (
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-primary font-semibold text-sm">
                          ចុចដើម្បីមើលទីតាំង:
                        </p>
                      </div>
                      <MapPin className="w-4 h-4 text-blue-500" />
                      {activeEvent.locationMapUrl ? (
                        <a
                          href={activeEvent.locationMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 font-semibold text-sm underline hover:text-primary/80"
                        >
                          {activeEvent.locationName}
                        </a>
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {activeEvent.locationName}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <CardDescription className="text-primary-foreground">
            សូមបំពេញបែបបទ ដើម្បីចូលរួមព្រឹត្តិការណ៍នេះ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <h3 className="text-lg font-semibold text-primary/80 mb-4">
                រូបថតរបស់អ្នក (Profile Image)
              </h3>

              <div
                className={`flex flex-col items-center gap-4 mb-6 p-6 bg-zinc-800/30 rounded-2xl border border-dashed transition-colors ${form.formState.errors.profileImage ? "border-red-500/50 bg-red-500/5" : "border-zinc-800"}`}
              >
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 group-hover:border-primary transition-colors flex items-center justify-center relative shadow-xl">
                    {form.watch("profileImage") ? (
                      <NextImage
                        src={form.watch("profileImage") as string}
                        alt="Profile Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex flex-col items-center text-zinc-500">
                        <Loader2
                          className={`w-8 h-8 absolute ${isUploadingProfile ? "animate-spin opacity-100" : "opacity-0"}`}
                        />
                        <NextImage
                          src="/black-logo.png"
                          alt="Logo"
                          width={40}
                          height={40}
                          className={`opacity-20 ${isUploadingProfile ? "hidden" : ""}`}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full w-10 h-10 shadow-lg bg-primary hover:bg-primary/90 border-2 border-zinc-900"
                    onClick={() => profileInputRef.current?.click()}
                    disabled={isUploadingProfile}
                  >
                    {isUploadingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 rotate-180" />
                    )}
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-300">
                    រូបថតរបស់អ្នក
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                    សូម Upload រូបភាពដែលមានផ្ទៃមុខរបស់អ្នក (JPG or PNG)
                  </p>
                </div>
                <Input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfileImageUpload(file);
                  }}
                />
                {!form.watch("profileImage") && (
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full bg-primary transition-all duration-300 ${isUploadingProfile ? "w-1/2 animate-pulse" : "w-0"}`}
                    />
                  </div>
                )}
                {form.formState.errors.profileImage && (
                  <div className="text-[13px] font-medium text-red-500 mt-2 text-center animate-in fade-in slide-in-from-top-1">
                    {form.formState.errors.profileImage.message}
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-primary">
                ព័ត៌មានអ្នកប្រើប្រាស់
              </h3>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ឈ្មោះពេញ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក"
                        className="bg-zinc-800 border-zinc-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>តួនាទីលើទីលាន</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="សូមជ្រើសរើសតួនាទីរបស់អ្នក" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="goalkeeper">
                          អ្នកចាំទី (Goalkeeper)
                        </SelectItem>
                        <SelectItem value="defender">
                          ខ្សែការពារ (Defender)
                        </SelectItem>
                        <SelectItem value="midfielder">
                          ខ្សែបម្រើ (Midfielder)
                        </SelectItem>
                        <SelectItem value="forward">
                          ខ្សែប្រយុទ្ធ (Forward)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>អាយុ</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-zinc-800 border-zinc-700"
                          {...field}
                          value={field.value as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>លេខទូរស័ព្ទ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="សូមបញ្ចូលលេខទូរស័ព្ទ"
                          className="bg-zinc-800 border-zinc-700"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-lg font-semibold text-primary">
                  ផ្ទៀងផ្ទាត់ការតាមដាន
                </h3>
                <div ref={tasksSectionRef} />
                {Object.keys(proofErrors).length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-medium text-red-400">
                      សូមមេត្តា Upload រូបភាពដែលនៅខ្វះ (ចំណុចពណ៌ក្រហម)
                    </p>
                  </div>
                )}
                <p className="text-sm text-primary-foreground pb-2">
                  សូមចុចតំណភ្ជាប់ខាងក្រោម រួច Upload
                  រូបថតអេក្រង់បញ្ជាក់ថាអ្នកបាន Follow, Like និង Subscribe។
                  ប្រព័ន្ធ AI នឹងផ្ទៀងផ្ទាត់រូបភាព រួចចេញសំបុត្រ (QR Code)
                  ជូនអ្នកក្នុងពេលឆាប់ៗ
                </p>

                {isLoadingTasks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  tasks &&
                  tasks.length > 0 &&
                  tasks.map((task: ApiSocialMediaTask) => (
                    <div
                      key={task.id}
                      className="space-y-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-800"
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.type === "facebook" && (
                            <Facebook className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          {task.type === "telegram" && (
                            <Send className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                          {task.type === "tiktok" && (
                            <Music2 className="w-4 h-4 text-pink-400 shrink-0" />
                          )}
                          {task.type === "youtube" && (
                            <Youtube className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {task.label || `Verify ${task.type}`}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 ${
                              proofErrors[task.id.toString()]
                                ? "border-red-500 text-red-500 bg-red-500/10 animate-pulse"
                                : "border-zinc-700 text-zinc-500"
                            }`}
                          >
                            {proofErrors[task.id.toString()]
                              ? "ចាំបាច់ / Required"
                              : "Required"}
                          </Badge>
                        </div>
                        <a
                          href={
                            task.url.startsWith("http")
                              ? task.url
                              : `https://${task.url}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 underline hover:opacity-80 font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          បើកលីង <LinkIcon className="w-3 h-3" />
                        </a>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={(el) => {
                          fileInputRefs.current[task.id.toString()] = el;
                        }}
                        className={`bg-zinc-800 border-zinc-700 h-10 text-xs file:bg-zinc-900 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold file:px-3 file:py-1 file:mr-3 hover:file:bg-zinc-700 cursor-pointer ${
                          proofErrors[task.id.toString()]
                            ? "border-red-500 ring-2 ring-red-500/20 animate-shake"
                            : ""
                        }`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              await handleProofUpload(task.id.toString(), file);
                              setProofErrors((prev) => {
                                const next = { ...prev };
                                delete next[task.id.toString()];
                                return next;
                              });
                              toast.success(
                                `${task.type.charAt(0).toUpperCase() + task.type.slice(1)} proof uploaded`,
                              );
                            } catch (error) {}
                          }
                        }}
                      />
                      {/* Thumbnail preview */}
                      {localPreviews[task.id.toString()] && (
                        <div className="relative mt-2 inline-block">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxSrc(localPreviews[task.id.toString()])
                            }
                            className="group relative block rounded-lg overflow-hidden border-2 border-zinc-700 hover:border-primary transition-colors"
                            title="Click to preview"
                          >
                            <NextImage
                              src={localPreviews[task.id.toString()]}
                              alt="Preview"
                              width={72}
                              height={72}
                              className="object-cover w-[72px] h-[72px]"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-semibold">
                                Preview
                              </span>
                            </div>
                            {!socialProofs[task.id.toString()] && (
                              <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 flex items-center justify-center py-0.5">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              </div>
                            )}
                          </button>
                          {/* Remove button */}
                          <button
                            type="button"
                            title="Remove image"
                            onClick={async () => {
                              const taskId = task.id.toString();
                              const url = socialProofs[taskId];
                              if (url) {
                                fetch(
                                  `/api/upload?url=${encodeURIComponent(url)}`,
                                  { method: "DELETE" },
                                ).catch(console.error);
                              }
                              setLocalPreviews((prev) => {
                                const next = { ...prev };
                                delete next[taskId];
                                return next;
                              });
                              setSocialProofs((prev) => {
                                const next = { ...prev };
                                delete next[taskId];
                                return next;
                              });
                              const input = fileInputRefs.current[taskId];
                              if (input) input.value = "";
                            }}
                            className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 border border-zinc-600 hover:bg-red-600 hover:border-red-500 text-zinc-300 hover:text-white transition-colors shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {proofErrors[task.id.toString()] && (
                        <div className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm shadow-red-500/5">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight opacity-70">
                              Verification Note
                            </span>
                            <p className="text-xs font-medium text-red-200/90 leading-relaxed first-letter:uppercase">
                              {proofErrors[task.id.toString()].replace(
                                /^[.\s]+/,
                                "",
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {!isLoadingTasks && tasks && tasks.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 italic bg-zinc-800/20 rounded-xl border border-dashed border-zinc-800">
                    No social tasks required for this event.
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-lg font-semibold text-primary">
                  លក្ខខណ្ឌ និងការយល់ព្រម
                </h3>

                <FormField
                  control={form.control}
                  name="agreedTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-zinc-800 rounded-md bg-zinc-800/50">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          ខ្ញុំយល់ព្រមឱ្យ Next Play Live ប្រើប្រាស់រូបភាព
                          របស់ខ្ញុំក្នុងការផ្សព្វផ្សាយ។
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={isMutating}
              >
                {isMutating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    កំពុងផ្ទៀងផ្ទាត់រូបថតអេក្រង់ដោយ AI...
                  </span>
                ) : (
                  "Submit Registration"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              onClick={() => router.push("/")}
              disabled={isMutating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox for image preview */}
      <Dialog
        open={!!lightboxSrc}
        onOpenChange={(open) => !open && setLightboxSrc(null)}
      >
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 p-2 **:data-[slot=dialog-close]:text-primary-foreground">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>
              Full size preview of your uploaded screenshot
            </DialogDescription>
          </DialogHeader>
          {lightboxSrc && (
            <div className="relative w-full" style={{ maxHeight: "85vh" }}>
              <NextImage
                src={lightboxSrc as string}
                alt="Full preview"
                width={1200}
                height={900}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success QR Dialog (shown right after registration) */}
      <Dialog
        open={!!qrCodeData}
        onOpenChange={(open) => !open && setQrCodeData(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-primary">
              អបអរសាទរ! អ្នកចុះឈ្មោះជោគជ័យហើយ
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              ✅ សូមថតរូបអេក្រង់ (Screenshot) សារនេះ ឬ ទាញយក QR Code ខាងក្រោម
              ដើម្បីបង្ហាញជូនក្រុមការងារនៅមាត់ច្រកចូលប្រកួត។
            </DialogDescription>
          </DialogHeader>
          <div
            id="registration-qr"
            className="flex justify-center p-6 bg-white rounded-lg mx-auto w-fit"
          >
            {qrCodeData && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <QRCode value={qrCodeData as string} size={200} level="H" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white p-1 rounded-sm">
                      <NextImage
                        src="/black-logo.png"
                        alt="Next Play"
                        width={50}
                        height={50}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-zinc-500">
                  ID:{" "}
                  <span className="font-mono text-zinc-300">{qrCodeData}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={downloadQRCode}
              className="bg-primary hover:bg-primary/90 text-white w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </Button>
            <Button
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 w-full"
              onClick={() => setQrCodeData(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
