"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarga los datos del servidor cada N segundos (útil si el tablero se proyecta en una pantalla). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
