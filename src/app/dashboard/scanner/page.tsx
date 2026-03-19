"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { rpc } from "@/lib/rpc";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X } from "lucide-react";

const QrScanner = dynamic(() => import("@/components/ui/qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square flex flex-col items-center justify-center text-zinc-500 gap-4 bg-zinc-950 rounded-lg">
      <div className="w-10 h-10 border-2 border-zinc-800 border-t-primary rounded-full animate-spin" />
      <p className="text-sm font-medium text-zinc-400">Loading Camera...</p>
    </div>
  ),
});

export default function ScannerPage() {
  const [data, setData] = useState<string>("No result");
  const [scanResult, setScanResult] = useState<Record<string, any> | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchRegistration = async (id: string) => {
    try {
      const res = await rpc.register[":id"].$get({ param: { id } });
      if (res.ok) {
        const result = await res.json();
        setScanResult(result.data);
        setErrorMsg("");
        console.log(result.data);
      } else {
        setScanResult(null);
        setErrorMsg("Registration not found or invalid QR code.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error.");
    }
  };

  const markAsScanned = async (id: string) => {
    setIsUpdating(true);
    try {
      const res = await rpc.register[":id"].scan.$patch({ param: { id } });
      if (res.ok) {
        // toast.success("Verification successful!");
        // Clear result and restart scanning for next person
        setScanResult(null);
        setData("No result");
        setIsScanning(true);
      } else {
        setErrorMsg("Failed to mark as scanned.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto ">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">QR Scanner</h1>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          onClick={() => {
            setIsScanning(!isScanning);
            if (!isScanning) {
              setScanResult(null);
              setData("No result");
              setErrorMsg("");
            }
          }}
        >
          {isScanning ? "Stop Camera" : "Start Camera"}
        </Button>
      </div>

      <div className="relative">
        {isScanning && (
          <div className={scanResult ? "hidden" : "block"}>
            <Card className="bg-zinc-900 border-none overflow-hidden shadow-2xl p-0">
              <CardContent className="p-0">
                <QrScanner
                  isScanning={isScanning}
                  onResult={(qrText) => {
                    if (qrText !== data && !scanResult) {
                      setData(qrText);
                      fetchRegistration(qrText);
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {scanResult && (
          <div className="animate-in fade-in zoom-in duration-300">
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Participant Found</CardTitle>
                    <CardDescription className="text-zinc-400">
                      {scanResult.eventName ? (
                        <span className="text-primary font-semibold">
                          Event: {scanResult.eventName}
                        </span>
                      ) : (
                        "Review details below."
                      )}
                    </CardDescription>
                  </div>
                  {scanResult.scanned ? (
                    <Badge className="bg-primary hover:bg-emerald-700">
                      Verified On-site
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-zinc-700 text-zinc-400 font-normal"
                    >
                      Pending Scanner
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 font-medium">Full Name</p>
                    <p className="text-zinc-200 font-semibold">
                      {scanResult.fullName}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Position</p>
                    <p className="text-zinc-200 font-semibold">
                      {scanResult.position}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Age</p>
                    <p className="text-zinc-200 font-semibold">
                      {scanResult.age}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Contact</p>
                    <p className="text-zinc-200">{scanResult.phone}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Social Proofs</p>
                    <div className="space-y-2 mt-1">
                      {scanResult.socialProofs ? (
                        (() => {
                          try {
                            const proofs = JSON.parse(scanResult.socialProofs);
                            const proofEntries = Object.entries(proofs);

                            if (proofEntries.length === 0)
                              return (
                                <p className="text-zinc-500 italic text-xs">
                                  No proofs uploaded
                                </p>
                              );

                            return (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {proofEntries.map(([taskId, url]) => (
                                  <button
                                    key={taskId}
                                    type="button"
                                    onClick={() => setPreviewUrl(url as string)}
                                    className="relative group rounded overflow-hidden border border-zinc-700 hover:border-primary transition-colors"
                                    title={`Task #${taskId} — click to preview`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url as string}
                                      alt={`Task #${taskId} proof`}
                                      className="w-16 h-16 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-white text-[10px] font-bold">
                                        Preview
                                      </span>
                                    </div>
                                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-zinc-300 text-center py-0.5">
                                      #{taskId}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            return (
                              <p className="text-red-400 text-xs">
                                Error parsing proofs
                              </p>
                            );
                          }
                        })()
                      ) : (
                        <p className="text-zinc-500 italic text-xs">
                          None required
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {!scanResult.scanned ? (
                  <Button
                    onClick={() => markAsScanned(scanResult.id.toString())}
                    disabled={isUpdating}
                    className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                  >
                    {isUpdating ? "Updating..." : "Verify & Mark as Scanned"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScanResult(null);
                      setData("No result");
                      setIsScanning(true);
                    }}
                    className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white mt-4"
                  >
                    Close
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 my-4">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-primary">Scanner Error</p>
              <p className="text-zinc-400 text-xs">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>
      {/* Lightbox Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Social proof preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
