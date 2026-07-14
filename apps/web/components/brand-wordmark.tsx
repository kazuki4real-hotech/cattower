import Image from "next/image";

export function BrandWordmark({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      className="brand-wordmark"
      src="/images/cattower-wordmark.webp"
      width={1832}
      height={440}
      sizes="140px"
      priority={priority}
      alt="CatTower"
    />
  );
}
