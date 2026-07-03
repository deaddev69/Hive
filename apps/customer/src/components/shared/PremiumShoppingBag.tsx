import React from "react";

interface PremiumShoppingBagProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const PremiumShoppingBag: React.FC<PremiumShoppingBagProps> = ({
  size,
  stroke = "currentColor",
  strokeWidth = 1.5,
  className = "",
  ...props
}) => {
  // Use className width/height if available, otherwise fallback to size or default 24
  const hasWidthOrHeight = className.includes("w-") || className.includes("h-");
  const finalSize = hasWidthOrHeight ? undefined : (size || 24);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={finalSize}
      height={finalSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Bag Body: elegant vertical rectangle with subtle curve at base */}
      <path d="M6 20V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z" />
      {/* Curved handle */}
      <path d="M9 6a3 3 0 0 1 6 0" />
    </svg>
  );
};
