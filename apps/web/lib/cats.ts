export function serializeCat(cat: {
  id: string;
  name: string;
  nickname: string | null;
  birthDate: Date | null;
  birthPrecision: "day" | "month" | "year" | "unknown";
  adoptionDate: Date | null;
  profileAssetId: string | null;
  themeColor: string;
  lifeStatus: "living" | "memorial";
  archivedAt: Date | null;
}) {
  return {
    ...cat,
    birthDate: cat.birthDate?.toISOString().slice(0, 10) ?? null,
    adoptionDate: cat.adoptionDate?.toISOString().slice(0, 10) ?? null,
    archivedAt: cat.archivedAt?.toISOString() ?? null,
  };
}
