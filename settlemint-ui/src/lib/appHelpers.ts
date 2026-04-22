export function extractInviteCode(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.searchParams.get("invite")?.trim() || trimmedValue;
  } catch {
    return trimmedValue;
  }
}

export function formatErrorMessage(error: unknown, fallbackMessage: string) {
  const message =
    error instanceof Error && error.message.trim() !== ""
      ? error.message.trim()
      : fallbackMessage;

  return message.charAt(0).toUpperCase() + message.slice(1);
}
