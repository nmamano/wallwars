export function parseBooleanCookie(
  value: string | boolean | undefined,
  defaultValue: boolean
): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return defaultValue;
}
