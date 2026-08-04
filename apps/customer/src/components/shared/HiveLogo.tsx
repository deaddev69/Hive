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
  const sizeClass = sizeClasses[variant][size];

  const content = (
    <div className="flex items-center gap-2 select-none">
      <Image
        src="/icon-512x512.png"
        alt="Hive Logo"
        width={40}
        height={40}
        priority
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain shadow-xs"
      />
      {roleLabel && (
        <div className="flex flex-col border-l border-slate-300 pl-2.5 py-0.5">
          <span className="text-[10px] sm:text-xs font-extrabold tracking-[0.2em] text-amber-600 whitespace-nowrap leading-none font-sans">
            {roleLabel}
          </span>
        </div>
      )}
    </div>
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
