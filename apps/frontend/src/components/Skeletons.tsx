"use client";

/**
 * Skeleton loading components for MetroRadar
 *
 * Rule: Never show "Loading..." text alone.
 * Use skeletons for: Journey, Digital Twin, Search, Dashboard Cards.
 */

export function SkeletonLine({
  w = "w-full",
  h = "h-4",
  className = "",
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return (
    <div
      className={`${w} ${h} bg-white/10 rounded-lg animate-pulse ${className}`}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-white/10 space-y-3">
      <SkeletonLine w="w-24" h="h-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} w={i % 2 === 0 ? "w-full" : "w-3/4"} h="h-3" />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="glass-card rounded-xl p-4 border border-white/10 flex flex-col justify-between gap-4 animate-pulse">
      <div className="flex justify-between items-start">
        <SkeletonLine w="w-20" h="h-3" />
        <div className="w-8 h-8 rounded-full bg-white/10" />
      </div>
      <div className="space-y-2">
        <SkeletonLine w="w-16" h="h-6" />
        <SkeletonLine w="w-24" h="h-2" />
      </div>
    </div>
  );
}

export function SkeletonSearchResult() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
      <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
    </div>
  );
}

export function SkeletonDigitalTwin() {
  return (
    <div className="space-y-4 p-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <SkeletonLine w="w-16" h="h-2" />
          <SkeletonLine w="w-40" h="h-5" />
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
      </div>
      {/* Cards */}
      <SkeletonCard rows={3} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={4} />
    </div>
  );
}

export function SkeletonJourneyRoute() {
  return (
    <div className="glass-card rounded-xl p-4 border border-white/10 space-y-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded bg-white/10" />
          <div className="h-5 w-24 rounded bg-white/10" />
        </div>
        <div className="h-5 w-12 rounded-full bg-white/10" />
      </div>
      <div className="border-t border-white/5 pt-3 flex justify-between">
        <div className="space-y-1.5">
          <SkeletonLine w="w-16" h="h-4" />
          <SkeletonLine w="w-28" h="h-2" />
        </div>
        <div className="space-y-1.5 text-right">
          <SkeletonLine w="w-12" h="h-4" />
          <SkeletonLine w="w-16" h="h-2" />
        </div>
      </div>
    </div>
  );
}
