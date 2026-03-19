"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useEffect, useState } from "react";

interface QrScannerProps {
  onResult: (result: string) => void;
  isScanning: boolean;
}

export default function QrScanner({ onResult, isScanning }: QrScannerProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || !isScanning) return null;

  return (
    <div className="relative w-full aspect-square  overflow-hidden rounded-lg">
      <Scanner
        onScan={(detectedCodes) => {
          if (detectedCodes.length > 0) {
            onResult(detectedCodes[0].rawValue);
          }
        }}
        onError={(error) => {
          console.error("Scanner error:", error);
        }}
        styles={{
          container: {
            width: "100%",
            height: "100%",
          },
          video: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
          },
        }}
        components={{
          torch: true,
          finder: false,
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-40 border-black/40">
          <div className="w-full h-full border-2 border-primary/50 relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary" />
          </div>
        </div>
        <div className="absolute left-[40px] right-[40px] h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(255,8,8,0.8)] animate-scan-line" />
      </div>

      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 40px;
          }
          100% {
            top: calc(100% - 40px);
          }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
