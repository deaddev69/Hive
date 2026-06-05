import React from "react";
import { OccasionChip } from "./OccasionChip";

export interface Occasion {
  id: string;
  label: string;
  icon: string;
}

export const occasions: Occasion[] = [
  {
    id: "all",
    label: "All",
    icon: "✨",
  },
  {
    id: "wedding",
    label: "Wedding Guest",
    icon: "💍",
  },
  {
    id: "festival",
    label: "Festival",
    icon: "🎉",
  },
  {
    id: "workwear",
    label: "Work Wear",
    icon: "💼",
  },
  {
    id: "party",
    label: "Party Night",
    icon: "🥂",
  },
  {
    id: "casual",
    label: "Casual Day",
    icon: "☀️",
  },
  {
    id: "date",
    label: "Date Night",
    icon: "🌹",
  },
  {
    id: "ethnic",
    label: "Ethnic",
    icon: "🪔",
  },
  {
    id: "coords",
    label: "Co-ords",
    icon: "✨",
  },
];

export interface OccasionRailProps {
  selectedOccasion: string;
  onOccasionChange: (occasionId: string) => void;
}

export const OccasionRail: React.FC<OccasionRailProps> = ({
  selectedOccasion,
  onOccasionChange,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col gap-4">
      {/* Rail Label / Header */}
      <div className="flex flex-col text-left items-start gap-1">
        <span className="text-[10px] font-bold text-hive-amber tracking-widest uppercase">
          Shop by Vibe
        </span>
        <h2 className="text-xl md:text-2xl font-extrabold font-serif text-hive-dark">
          Curated for the Occasion
        </h2>
      </div>

      {/* Horizontal Scroll on Mobile, Wrap on Desktop */}
      <div
        role="radiogroup"
        aria-label="Filter products by occasion"
        className="flex gap-3 overflow-x-auto w-full py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:justify-start"
      >
        {occasions.map((occasion) => (
          <OccasionChip
            key={occasion.id}
            id={occasion.id}
            label={occasion.label}
            icon={occasion.icon}
            isActive={selectedOccasion === occasion.id}
            onClick={() => onOccasionChange(occasion.id)}
          />
        ))}
      </div>
    </div>
  );
};
