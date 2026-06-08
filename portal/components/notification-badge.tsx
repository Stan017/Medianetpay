"use client";

import { useState, useEffect } from "react";
import { getUnreadCount } from "@/lib/notif-store";

export function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getUnreadCount());
    update(); // leer al montar
    window.addEventListener("mnp-notif-update", update);
    window.addEventListener("storage", update); // sync entre tabs
    return () => {
      window.removeEventListener("mnp-notif-update", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-black"
      style={{ background: "#F89937" }}
    >
      {count}
    </span>
  );
}
