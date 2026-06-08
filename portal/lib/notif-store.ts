const COUNT_KEY = "mnp_unread_count";
const READ_KEY  = "mnp_read_ids";

export function getUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
}

export function getReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"); } catch { return []; }
}

export function saveReadState(readIds: string[], unreadCount: number) {
  localStorage.setItem(READ_KEY,  JSON.stringify(readIds));
  localStorage.setItem(COUNT_KEY, String(unreadCount));
  window.dispatchEvent(new Event("mnp-notif-update"));
}
