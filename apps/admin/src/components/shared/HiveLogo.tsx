import Image from "next/image";
import Link from "next/link";

interface HiveLogoProps {
  roleLabel?: "ADMIN PANEL" | "DESIGNER PANEL" | "Boutique Portal" | "SELLER CENTER" | string;
  href?: string;
  className?: string;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "h-11 sm:h-10",
  md: "h-14 sm:h-12",
};

export function HiveLogo({ roleLabel, href = "/", className = "", size = "md" }: HiveLogoProps) {
  const displayLabel = roleLabel === "DESIGNER PANEL" ? "Boutique Portal" : roleLabel;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 hover:opacity-85 active:scale-[0.98] transition-all duration-200 cursor-pointer ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Hive"
        width={180}
        height={75}
        priority
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {displayLabel && (
        <div className="flex flex-col border-l border-hive-border/40 pl-3 py-1">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-hive-gold whitespace-nowrap leading-none font-sans">
            {displayLabel}
          </span>
        </div>
      )}
    </Link>
  );
}
