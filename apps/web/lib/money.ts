// Money helpers — all values are integer paisa (1/100 PKR rupee).

export function formatPaisa(paisa: number, currency = "PKR"): string {
  const negative = paisa < 0;
  const abs = Math.abs(paisa);
  const rupees = Math.floor(abs / 100);
  const paisaPart = abs % 100;
  const str = `${rupees.toLocaleString("en-PK")}.${paisaPart
    .toString()
    .padStart(2, "0")}`;
  return `${negative ? "-" : ""}${currency === "PKR" ? "Rs " : ""}${str}`;
}

export function paisaFromRupees(rupees: number): number {
  return Math.round(rupees * 100);
}

export function gstAmount(subtotalPaisa: number, ratePercent: number): number {
  return Math.round((subtotalPaisa * ratePercent) / 100);
}
