import React from "react";

interface PremiumShoppingBagProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const PremiumShoppingBag: React.FC<PremiumShoppingBagProps> = ({
  size,
  stroke = "currentColor",
  strokeWidth = 1.75,
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
      {/* Flared Boutique Tote Silhouette */}
      <path d="M5.5 8.5L6.8 19.2A2 2 0 0 0 8.8 21h6.4a2 2 0 0 0 2-1.8L18.5 8.5H5.5Z" />

      {/* Tall Arched Handle */}
      <path d="M9 8.5V6a3 3 0 0 1 6 0v2.5" />

      {/* Luxury Hardware Studs/Rivets */}
      <circle cx="9" cy="8.5" r="0.75" fill={stroke} stroke="none" />
      <circle cx="15" cy="8.5" r="0.75" fill={stroke} stroke="none" />

      {/* Signature Hive Hexagonal Badge */}
      <path
        d="M12 11.8l1.8 1v2L12 15.8l-1.8-1v-2z"
        strokeWidth={1.25}
        className="opacity-75"
      />
    </svg>
  );
};
