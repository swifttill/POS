export const MIN_TOUCH_TARGET_PX = 44;
export const PRIMARY_TOUCH_TARGET_PX = 48;
export type PosShortcut = "NEW_ORDER" | "OPEN_ORDERS" | "TABLES" | "SEARCH" | "PAY" | "ESCAPE";
export function resolvePosShortcut(input: { key: string; ctrlKey?: boolean; metaKey?: boolean }): PosShortcut | null {
  const key = input.key.toLowerCase();
  if ((input.ctrlKey || input.metaKey) && key === "k") return "SEARCH";
  if (key === "f2") return "NEW_ORDER";
  if (key === "f3") return "OPEN_ORDERS";
  if (key === "f4") return "TABLES";
  if (key === "f9") return "PAY";
  if (key === "escape") return "ESCAPE";
  return null;
}
export function nextGridIndex(current: number, key: string, columns: number, count: number) {
  if (count <= 0) return -1;
  const colCount = Math.max(1, columns);
  if (key === "ArrowRight") return Math.min(count - 1, current + 1);
  if (key === "ArrowLeft") return Math.max(0, current - 1);
  if (key === "ArrowDown") return Math.min(count - 1, current + colCount);
  if (key === "ArrowUp") return Math.max(0, current - colCount);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return current;
}
export function shouldReduceMotion(prefersReducedMotion: boolean) { return prefersReducedMotion; }
export function clampTouchQuantity(value: number) { return Math.max(1, Math.min(999, Math.trunc(value))); }
