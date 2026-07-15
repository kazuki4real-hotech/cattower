import { isCatThemeColor, type CatThemeColor } from "./index";

export const BIRTH_PRECISIONS = ["day", "month", "year", "unknown"] as const;
export type BirthPrecision = (typeof BIRTH_PRECISIONS)[number];
export type CatLifeStatus = "living" | "memorial";

export function validateCatProfile(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const nickname =
    typeof input.nickname === "string" ? input.nickname.trim() : "";
  const birthPrecision = BIRTH_PRECISIONS.includes(
    input.birthPrecision as BirthPrecision,
  )
    ? (input.birthPrecision as BirthPrecision)
    : null;
  const lifeStatus: CatLifeStatus | null =
    input.lifeStatus === "living" || input.lifeStatus === "memorial"
      ? input.lifeStatus
      : null;
  const themeColor = isCatThemeColor(input.themeColor)
    ? input.themeColor
    : null;
  const parsedBirthDate = parseDate(input.birthDate);
  const birthDate = birthPrecision === "unknown" ? null : parsedBirthDate;
  const adoptionDate = parseDate(input.adoptionDate);
  if (
    !name ||
    name.length > 50 ||
    nickname.length > 50 ||
    !birthPrecision ||
    !lifeStatus ||
    !themeColor
  )
    return null;
  if (birthPrecision !== "unknown" && !birthDate) return null;
  if (birthPrecision !== "unknown" && input.birthDate && !parsedBirthDate)
    return null;
  if (input.adoptionDate && !adoptionDate) return null;
  return {
    name,
    nickname: nickname || null,
    birthPrecision,
    birthDate,
    adoptionDate,
    lifeStatus,
    themeColor: themeColor as CatThemeColor,
  };
}

function parseDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}
