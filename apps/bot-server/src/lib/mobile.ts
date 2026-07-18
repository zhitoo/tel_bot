const IRAN_MOBILE_REGEX = /^(?:0|98|\+98)9\d{9}$/;

export function isValidIranMobile(raw: string): boolean {
  return IRAN_MOBILE_REGEX.test(raw.trim());
}

/** Normalizes any accepted Iranian mobile format to `09xxxxxxxxx`. */
export function normalizeIranMobile(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/^\+?98/, "0").replace(/^98/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}
