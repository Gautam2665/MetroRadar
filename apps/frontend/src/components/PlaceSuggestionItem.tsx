"use client";

import React from "react";
import { PlaceSuggestion } from "../models/search";

interface Props {
  suggestion: PlaceSuggestion;
  onSelect: (item: PlaceSuggestion) => void;
}

export const PlaceSuggestionItem: React.FC<Props> = ({ suggestion, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(suggestion)}
      className="flex items-start gap-3.5 px-4 py-3 hover:bg-white/[0.06] cursor-pointer transition-colors border-b border-white/[0.04] last:border-b-0"
    >
      {/* Google Maps Pin / Building Icon */}
      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
        <span className="material-symbols-outlined text-[17px]">
          {suggestion.type === "station" ? "subway" : "location_on"}
        </span>
      </div>

      {/* 2-Line Content */}
      <div className="flex-1 min-w-0">
        {/* Top: Full Place Name */}
        <div className="text-[14px] font-medium text-slate-100 truncate tracking-wide">
          {suggestion.name}
        </div>

        {/* Bottom: Small Address + Transit Context */}
        <div className="text-[12px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5 font-normal">
          <span className="truncate">{suggestion.address}</span>

          {suggestion.nearestStation && (
            <>
              <span className="text-slate-600 flex-shrink-0">•</span>
              <span className="flex-shrink-0 flex items-center gap-1 text-slate-300">
                <span
                  className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: suggestion.nearestStation.lineColor }}
                />
                <span className="text-slate-400">
                  {suggestion.nearestStation.walkDistance
                    ? `${suggestion.nearestStation.walkDistance} from ${suggestion.nearestStation.name}`
                    : `Near ${suggestion.nearestStation.name}`}
                </span>
              </span>
            </>
          )}

          {suggestion.isOutOfCoverage && (
            <>
              <span className="text-slate-600 flex-shrink-0">•</span>
              <span className="text-amber-400 text-[11px] font-semibold flex-shrink-0">
                Outside Metro Network
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
