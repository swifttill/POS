export type CompanySettings = {
  name: string; legalName?: string; phone?: string; email?: string; address?: string;
  currencyCode: string; timezone: string; taxEnabled: boolean; taxLabel: string; taxRateBps: number;
};
export function validateCompanySettings(v: CompanySettings): string[] {
  const errors: string[] = [];
  if (!v.name.trim() || v.name.length > 120) errors.push("COMPANY_NAME_INVALID");
  if (!/^[A-Z]{3}$/.test(v.currencyCode)) errors.push("CURRENCY_CODE_INVALID");
  if (!v.timezone.includes("/") || v.timezone.length > 64) errors.push("TIMEZONE_INVALID");
  if (v.taxRateBps < 0 || v.taxRateBps > 10000 || !Number.isInteger(v.taxRateBps)) errors.push("TAX_RATE_INVALID");
  if (!v.taxLabel.trim() || v.taxLabel.length > 24) errors.push("TAX_LABEL_INVALID");
  return errors;
}
