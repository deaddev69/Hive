import Image from "next/image";
import Link from "next/link";

interface HiveLogoProps {
  roleLabel?: "ADMIN PANEL" | "DESIGNER PANEL";
  href?: string;
  className?: string;
  size?: "sm" | "md";
  noLink?: boolean;
  variant?: "navbar" | "pwa";
}

const sizeClasses = {
  navbar: {
    sm: "h-7 w-7 sm:h-8 sm:w-8",
    md: "h-9 w-9 sm:h-11 sm:w-11",
  },
  pwa: {
    sm: "h-4 sm:h-5 w-auto",
    md: "h-5 sm:h-7 w-auto",
  },
};

export function HiveLogo({ 
  roleLabel, 
  href = "/", 
  className = "", 
  size = "md", 
  noLink = false,
  variant = "navbar"
}: HiveLogoProps) {
  const isNavbar = variant === "navbar";
  const src = isNavbar ? "/logo-navbar.png" : "/logo.png";
  const width = isNavbar ? 120 : 180;
  const height = isNavbar ? 120 : 75;
  const sizeClass = sizeClasses[variant][size];

  const content = (
    <>
      <Image
        src={src}
        alt="Hive"
        width={width}
        height={height}
        priority
        className={`${sizeClass} object-contain`}
      />
      {roleLabel && (
        <div className="flex flex-col border-l border-hive-border/40 pl-3 py-1">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-hive-gold whitespace-nowrap leading-none font-sans">
            {roleLabel}
          </span>
        </div>
      )}
    </>
  );

  if (noLink) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 hover:opacity-85 active:scale-[0.98] transition-all duration-200 cursor-pointer ${className}`}
    >
      {content}
    </Link>
  );
}
