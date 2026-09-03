"use client";

import React, { useState, useEffect, useRef } from "react";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected");
  const [ping, setPing] = useState<number | null>(null);
  const pingRef = useRef<number>(0);

  useEffect(() => {
    const handleOnline = () => setStatus("connected");
    const handleOffline = () => setStatus("disconnected");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Her 5 sn'de bir ping olc
    const measurePing = async () => {
      const start = Date.now();
      pingRef.current = start;
      try {
        const res = await fetch("/api/whiteboard/ping", { method: "GET" });
        if (res.ok && pingRef.current === start) {
          setPing(Date.now() - start);
          setStatus("connected");
        }
      } catch {
        if (pingRef.current === start) {
          setStatus("reconnecting");
        }
      }
    };
    measurePing();
    const interval = setInterval(measurePing, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (status === "connected" && ping !== null) {
    const color = ping < 200 ? "text-green-600" : ping < 500 ? "text-amber-600" : "text-red-600";
    const dotColor = ping < 200 ? "bg-green-500" : ping < 500 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className={`fixed bottom-2 right-2 z-50 px-2 py-0.5 rounded-full shadow-sm border border-gray-200 bg-white/90 text-[10px] font-mono flex items-center gap-1.5 ${color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {ping}ms
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 bg-red-50 text-red-700 border-red-200">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        ⚠️ Bağlantı kesildi
      </div>
    );
  }

  if (status === "reconnecting") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 bg-amber-50 text-amber-700 border-amber-200">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        🔄 Yeniden bağlanılıyor...
      </div>
    );
  }

  return null;
}
