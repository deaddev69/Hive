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
    sm: "h-10 w-10 sm:h-12 sm:w-12",
    md: "h-13 w-13 sm:h-[4.25rem] sm:w-[4.25rem]",
  },
  pwa: {
    sm: "h-6 sm:h-7 w-auto",
    md: "h-7 sm:h-9 w-auto",
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
        width={56}
        height={56}
        priority
        className={`${sizeClass} rounded-xl object-contain shadow-xs`}
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
