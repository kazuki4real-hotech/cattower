export function getOnboardingRoute(step: number) {
  if (step < 1) return "/onboarding/profile";
  if (step < 2) return "/onboarding/cat";
  if (step < 3) return "/onboarding/photo";
  if (step < 4) return "/onboarding/theme";
  return "/onboarding/complete";
}

export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/^\/(?:api|auth|onboarding)(?:\/|$)/.test(value)) return null;
  return value;
}
