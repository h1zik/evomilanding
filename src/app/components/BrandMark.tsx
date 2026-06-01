const GRADIENT =
  "conic-gradient(from 0deg, #FFD521, #F50000, #B900B4, #1172ba, #FFD521)";

export function BrandMark({
  logoUrl,
  name,
  size = 36,
  className = "",
}: {
  logoUrl?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className={`object-contain shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size, background: GRADIENT }}
      aria-hidden
    />
  );
}
