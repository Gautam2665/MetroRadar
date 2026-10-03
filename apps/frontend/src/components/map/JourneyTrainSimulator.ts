/**
 * TransitOS — Journey Train Simulator
 * Isolated service providing smooth presentation-only route simulation for the selected candidate.
 * Follows the complete multi-leg trajectory without disappearing at leg transitions.
 * Directly updates MapLibre marker coordinates without triggering React re-renders.
 */

import maplibregl from "maplibre-gl";
import { RouteOption } from "../../containers/JourneyPlannerContainer";
import { shortLineName, resolveLineColor } from "../../utils/transitPresenter";

export interface TrajectorySegment {
  p1: [number, number];
  p2: [number, number];
  length: number;
  cumStart: number;
  cumEnd: number;
  legIndex: number;
  lineColor: string;
  lineName: string;
}

export interface TransferBeacon {
  marker: maplibregl.Marker;
  element: HTMLElement;
  glowEl: HTMLElement | null;
  coord: [number, number];
  stationName: string;
}

function getCoordDistance(c1: [number, number], c2: [number, number]): number {
  const dLng = (c2[0] - c1[0]) * Math.cos((((c1[1] + c2[1]) / 2) * Math.PI) / 180);
  const dLat = c2[1] - c1[1];
  return Math.hypot(dLng, dLat) * 111320;
}

export class JourneyTrainSimulator {
  private map: maplibregl.Map;
  private animFrameId: number | null = null;
  private trainMarker: maplibregl.Marker | null = null;
  private outerElement: HTMLElement | null = null;
  private rotatableElement: HTMLElement | null = null;
  private highlightCore: SVGElement | null = null;
  private headlampCone: SVGElement | null = null;
  private flagText: SVGElement | null = null;

  private beacons: TransferBeacon[] = [];
  private segments: TrajectorySegment[] = [];
  private totalLength = 0;
  private progress = 0;
  private lastTimestamp = 0;
  private isRunning = false;
  private onStationClick?: (props: Record<string, unknown>, coords: [number, number]) => void;
  private onStationHover?: (props: Record<string, unknown>, coords: [number, number]) => void;
  private onStationLeave?: () => void;

  constructor(
    map: maplibregl.Map,
    onStationClick?: (props: Record<string, unknown>, coords: [number, number]) => void,
    onStationHover?: (props: Record<string, unknown>, coords: [number, number]) => void,
    onStationLeave?: () => void
  ) {
    this.map = map;
    this.onStationClick = onStationClick;
    this.onStationHover = onStationHover;
    this.onStationLeave = onStationLeave;
  }

  /**
   * Updates or starts simulation on a candidate route.
   * If null, stops simulation and removes visuals.
   */
  public update(candidate: RouteOption | null): void {
    if (!candidate) {
      this.stop();
      return;
    }
    this.start(candidate);
  }

  /**
   * Starts route simulation for the given candidate.
   */
  public start(candidate: RouteOption): void {
    this.stop();

    if (!candidate.geojson || !candidate.geojson.features) {
      return;
    }

    this.buildTrajectory(candidate);
    if (this.segments.length === 0 || this.totalLength <= 0) {
      return;
    }

    this.createTransferBeacons(candidate);
    this.createTrainMarker();

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      this.renderFrame(0.5);
      return;
    }

    this.progress = 0;
    this.lastTimestamp = performance.now();
    this.isRunning = true;
    this.startAnimationLoop();
  }

  /**
   * Stops simulation and cleans up all markers and animation frames.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.trainMarker) {
      this.trainMarker.remove();
      this.trainMarker = null;
    }
    this.outerElement = null;
    this.rotatableElement = null;
    this.highlightCore = null;
    this.headlampCone = null;
    this.flagText = null;

    this.beacons.forEach((b) => b.marker.remove());
    this.beacons = [];
    this.segments = [];
    this.totalLength = 0;
  }

  /**
   * Permanent teardown when map is destroyed.
   */
  public destroy(): void {
    this.stop();
  }

  /**
   * Builds normalized continuous trajectory across all legs.
   */
  private buildTrajectory(candidate: RouteOption): void {
    this.segments = [];
    let cum = 0;

    const lineFeatures = candidate.geojson?.features.filter(
      (f) => f.geometry.type === "LineString"
    ) || [];

    if (lineFeatures.length === 0) return;

    lineFeatures.forEach((feat, legIdx) => {
      const coords = (feat.geometry as GeoJSON.LineString).coordinates as [number, number][];
      if (!coords || coords.length < 2) return;

      const legProps = candidate.legs[legIdx];
      const rawLine = feat.properties?.lineName || legProps?.line || "Metro Line";
      const cleanLine = shortLineName(rawLine);
      const lineColor = resolveLineColor(rawLine, feat.properties?.color || legProps?.color);

      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const dist = getCoordDistance(p1, p2);

        if (dist > 0.01) {
          this.segments.push({
            p1,
            p2,
            length: dist,
            cumStart: cum,
            cumEnd: cum + dist,
            legIndex: legIdx,
            lineColor,
            lineName: cleanLine,
          });
          cum += dist;
        }
      }
    });

    this.totalLength = cum;
  }

  /**
   * Creates prominent gold TRANSFER beacons on interchange stations.
   */
  private createTransferBeacons(candidate: RouteOption): void {
    if (!candidate.geojson) return;

    const lineFeatures = candidate.geojson.features.filter(
      (f) => f.geometry.type === "LineString"
    );

    // Detect transfer station coordinates from point features or intermediate junctions
    const transferPoints = candidate.geojson.features.filter(
      (f) => f.geometry.type === "Point" && (f.properties?.featureType === "journey-transfer" || f.properties?.isTransfer)
    );

    // If point features don't have all transfers, derive from legs
    const transferCoords: Array<{ name: string; coord: [number, number]; props: Record<string, unknown> }> = [];

    transferPoints.forEach((feat) => {
      let coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
      const name = (feat.properties?.name as string) || (feat.properties?.stationName as string) || "Transfer";

      // Snap coordinate to the closest line vertex if within 150m
      for (const lf of lineFeatures) {
        const lCoords = (lf.geometry as GeoJSON.LineString).coordinates as [number, number][];
        if (lCoords.length > 0) {
          const first = lCoords[0];
          const last = lCoords[lCoords.length - 1];
          if (getCoordDistance(coords, first) < 150) {
            coords = first;
            break;
          } else if (getCoordDistance(coords, last) < 150) {
            coords = last;
            break;
          }
        }
      }

      transferCoords.push({ name, coord: coords, props: feat.properties || {} });
    });

    // Fallback derivation if point features didn't include transfer points
    if (transferCoords.length === 0 && candidate.legs && candidate.legs.length > 1) {
      for (let i = 1; i < candidate.legs.length; i++) {
        const prevLeg = candidate.legs[i - 1];
        const currLeg = candidate.legs[i];
        if (prevLeg.line !== currLeg.line && currLeg.mode !== "walk") {
          const name = currLeg.fromStation || prevLeg.toStation || "Transfer";
          let junctionCoord: [number, number] | null = null;
          if (lineFeatures[i]) {
            const coords = (lineFeatures[i].geometry as GeoJSON.LineString).coordinates as [number, number][];
            if (coords && coords.length > 0) junctionCoord = coords[0];
          } else if (lineFeatures[i - 1]) {
            const coords = (lineFeatures[i - 1].geometry as GeoJSON.LineString).coordinates as [number, number][];
            if (coords && coords.length > 0) junctionCoord = coords[coords.length - 1];
          }
          if (junctionCoord) {
            transferCoords.push({
              name,
              coord: junctionCoord,
              props: {
                featureType: "journey-transfer",
                name,
                stationName: name,
              },
            });
          }
        }
      }
    }

    // Deduplicate beacons
    const seen = new Set<string>();
    const uniqueBeacons = transferCoords.filter((b) => {
      const key = `${b.coord[0].toFixed(4)}_${b.coord[1].toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniqueBeacons.forEach((b, idx) => {
      const safeId = `bpg_${idx}_${b.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

      const beaconEl = document.createElement("div");
      beaconEl.className = "interchange-beacon-node cursor-pointer relative flex items-center justify-center";
      beaconEl.style.width = "56px";
      beaconEl.style.height = "56px";
      beaconEl.style.pointerEvents = "auto";
      beaconEl.title = `TRANSFER: ${b.name} — Click to inspect`;

      beaconEl.addEventListener("mouseenter", () => {
        this.onStationHover?.(b.props, b.coord);
      });
      beaconEl.addEventListener("mouseleave", () => {
        this.onStationLeave?.();
      });
      beaconEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onStationClick?.(b.props, b.coord);
      });

      beaconEl.innerHTML = `
        <svg width="56" height="56" viewBox="-28 -28 56 56" class="overflow-visible pointer-events-none" style="pointer-events: none;">
          <!-- Outer expanding gold rings -->
          <circle cx="0" cy="0" r="7" fill="none" stroke="#facc15" class="transfer-highlight-ring" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="7" fill="none" stroke="#fbbf24" class="transfer-highlight-ring-delayed" stroke-width="2"/>
          <!-- Inner cyan radar ripple -->
          <circle cx="0" cy="0" r="7" fill="none" stroke="#06b6d4" class="radar-pulse-ring" stroke-width="1.5"/>
          <!-- Breathe halo (gold) -->
          <circle cx="0" cy="0" r="16" fill="#facc15" fill-opacity="0.1" stroke="#facc15" stroke-dasharray="4 3" stroke-width="1.2" class="interchange-breathe"/>
          <!-- Gold core dot -->
          <circle cx="0" cy="0" r="7" fill="#facc15" stroke="#080c14" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" opacity="0.9"/>
          <!-- TRANSFER label badge (gold pill above the dot) -->
          <g transform="translate(0, -28)">
            <rect x="-28" y="-9" width="56" height="16" rx="5" fill="#facc15" opacity="0.96" stroke="#fbbf24" stroke-width="0.5"/>
            <text x="0" y="4.5" fill="#080c14" font-family="monospace" font-size="7.5" font-weight="800" letter-spacing="0.8" text-anchor="middle">TRANSFER</text>
          </g>
          <!-- Proximity glow ring -->
          <circle cx="0" cy="0" r="20" fill="#facc15" fill-opacity="0" id="${safeId}"/>
        </svg>
      `;

      const marker = new maplibregl.Marker({
        element: beaconEl,
        anchor: "center",
      })
        .setLngLat(b.coord)
        .addTo(this.map);

      const glowEl = beaconEl.querySelector(`#${safeId}`) as HTMLElement | null;

      this.beacons.push({
        marker,
        element: beaconEl,
        glowEl,
        coord: b.coord,
        stationName: b.name,
      });
    });
  }

  /**
   * Creates the animated train capsule marker matching Stitch design.
   * CRITICAL ARCHITECTURAL FIX:
   * The outer element is owned by MapLibre (translate).
   * An inner child element handles rotation, so marker coordinates are NEVER clobbered!
   */
  private createTrainMarker(): void {
    const outerEl = document.createElement("div");
    outerEl.className = "journey-sim-train-container pointer-events-none select-none";
    outerEl.style.width = "64px";
    outerEl.style.height = "32px";
    outerEl.style.display = "flex";
    outerEl.style.alignItems = "center";
    outerEl.style.justifyContent = "center";
    outerEl.style.position = "relative";

    const innerEl = document.createElement("div");
    innerEl.className = "journey-sim-train-rotator";
    innerEl.style.width = "64px";
    innerEl.style.height = "32px";
    innerEl.style.display = "flex";
    innerEl.style.alignItems = "center";
    innerEl.style.justifyContent = "center";
    innerEl.style.transformOrigin = "center center";

    innerEl.innerHTML = `
      <svg width="68" height="44" viewBox="-34 -22 68 44" class="overflow-visible">
        <defs>
          <filter id="train-sim-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#22d3ee" flood-opacity="0.85"/>
          </filter>
        </defs>

        <!-- Forward Light Beam Cone -->
        <path d="M 0,-4 L 32,-13 L 32,13 L 0,4 Z" fill="#22d3ee" fill-opacity="0.28" id="sim-headlamp-cone"/>

        <!-- Radar Aura Ping -->
        <circle cx="0" cy="0" r="13" fill="#22d3ee" fill-opacity="0.3" class="animate-ping"/>

        <!-- Outer Pod Body -->
        <rect x="-14" y="-7.5" width="28" height="15" rx="7.5" fill="#080c14" stroke="#22d3ee" stroke-width="1.8" filter="url(#train-sim-glow)"/>

        <!-- Train Core Fill (Synchronized to active leg line color) -->
        <rect x="-11" y="-5" width="22" height="10" rx="5" fill="#ec6a06" id="sim-highlight-core"/>

        <!-- Dual Headlights -->
        <circle cx="8" cy="-2.5" r="1.5" fill="#ffffff"/>
        <circle cx="8" cy="2.5" r="1.5" fill="#ffffff"/>

        <!-- Top Floating Badge: ROUTE SIM -->
        <g transform="translate(0, -18)">
          <rect x="-34" y="-7.5" width="68" height="15" rx="4" fill="#0b1322" fill-opacity="0.96" stroke="#22d3ee" stroke-width="0.8"/>
          <circle cx="-25" cy="0" r="2.2" fill="#22d3ee"/>
          <text x="4" y="2.5" fill="#ffffff" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="700" letter-spacing="0.4" text-anchor="middle" id="sim-flag-text">ROUTE SIM</text>
        </g>
      </svg>
    `;

    outerEl.appendChild(innerEl);

    this.outerElement = outerEl;
    this.rotatableElement = innerEl;
    this.highlightCore = innerEl.querySelector("#sim-highlight-core");
    this.headlampCone = innerEl.querySelector("#sim-headlamp-cone");
    this.flagText = innerEl.querySelector("#sim-flag-text");

    const startCoord = this.segments[0]?.p1 || [0, 0];

    this.trainMarker = new maplibregl.Marker({
      element: outerEl,
      anchor: "center",
    })
      .setLngLat(startCoord)
      .addTo(this.map);
  }

  private startAnimationLoop(): void {
    const tick = (now: number) => {
      if (!this.isRunning) return;

      const delta = Math.min(now - this.lastTimestamp, 100);
      this.lastTimestamp = now;

      // Complete cycle in approx 18 seconds
      const baseCycleMs = 18000;
      this.progress = (this.progress + delta / baseCycleMs) % 1;

      this.renderFrame(this.progress);

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private renderFrame(p: number): void {
    if (!this.trainMarker || !this.rotatableElement || this.segments.length === 0) return;

    const targetDist = p * this.totalLength;

    let seg = this.segments[0];
    for (let i = 0; i < this.segments.length; i++) {
      if (targetDist >= this.segments[i].cumStart && targetDist <= this.segments[i].cumEnd) {
        seg = this.segments[i];
        break;
      }
    }

    const segSpan = seg.cumEnd - seg.cumStart;
    const segT = segSpan > 0 ? (targetDist - seg.cumStart) / segSpan : 0;

    const curLng = seg.p1[0] + segT * (seg.p2[0] - seg.p1[0]);
    const curLat = seg.p1[1] + segT * (seg.p2[1] - seg.p1[1]);
    const currentCoord: [number, number] = [curLng, curLat];

    // Safely update position via MapLibre API
    this.trainMarker.setLngLat(currentCoord);

    // Compute heading angle and apply to inner element ONLY
    const p1Screen = this.map.project(seg.p1);
    const p2Screen = this.map.project(seg.p2);
    const dx = p2Screen.x - p1Screen.x;
    const dy = p2Screen.y - p1Screen.y;

    if (Math.hypot(dx, dy) > 0.5) {
      const screenAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      this.rotatableElement.style.transform = `rotate(${screenAngle}deg)`;
    }

    // Synchronize active leg color and badge
    if (this.highlightCore) {
      this.highlightCore.setAttribute("fill", seg.lineColor);
    }
    if (this.headlampCone) {
      this.headlampCone.setAttribute("fill", seg.lineColor);
    }
    if (this.flagText) {
      const shortName = seg.lineName.length > 11 ? seg.lineName.slice(0, 9) + ".." : seg.lineName;
      this.flagText.textContent = `ROUTE SIM · ${shortName}`;
    }

    // Interchange Radar Beacon Proximity Effect
    this.beacons.forEach((b) => {
      const dist = getCoordDistance(currentCoord, b.coord);
      if (b.glowEl) {
        if (dist < 400) {
          const intensity = 1 - dist / 400;
          b.glowEl.setAttribute("fill-opacity", (intensity * 0.7).toFixed(2));
        } else {
          b.glowEl.setAttribute("fill-opacity", "0");
        }
      }
    });
  }
}
