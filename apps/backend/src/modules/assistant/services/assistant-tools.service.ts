import { Injectable, Logger } from '@nestjs/common';
import { StationResolverService } from './station-resolver.service';
import { JourneyService } from '../../journey/routing/journey.service';
import { RealtimeNetworkService } from '../../realtime/services/realtime-network.service';
import { DigitalTwinService } from '../../gis/services/digital-twin.service';

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  uiPayload?: {
    cardType: 'journey' | 'live_station' | 'digital_twin' | 'error';
    data: unknown;
  };
}

@Injectable()
export class AssistantToolsService {
  private readonly logger = new Logger(AssistantToolsService.name);

  constructor(
    private readonly stationResolver: StationResolverService,
    private readonly journeyService: JourneyService,
    private readonly realtimeNetworkService: RealtimeNetworkService,
    private readonly digitalTwinService: DigitalTwinService,
  ) {}

  /**
   * Tool 1: Plan Journey between two colloquial or formal station names
   */
  async planJourney(
    originStation: string,
    destinationStation: string,
    preference?: string,
    cityHint?: string,
  ): Promise<ToolExecutionResult> {
    this.logger.log(
      `Executing plan_journey: from="${originStation}" to="${destinationStation}" pref="${preference || 'default'}"`,
    );

    const origin = await this.stationResolver.resolveStation(
      originStation,
      cityHint,
    );
    if (!origin) {
      return {
        toolName: 'plan_journey',
        success: false,
        error: `Could not identify origin station "${originStation}". Please check the station name.`,
      };
    }

    const destination = await this.stationResolver.resolveStation(
      destinationStation,
      cityHint,
    );
    if (!destination) {
      return {
        toolName: 'plan_journey',
        success: false,
        error: `Could not identify destination station "${destinationStation}". Please check the station name.`,
      };
    }

    if (origin.id === destination.id) {
      return {
        toolName: 'plan_journey',
        success: false,
        error: `Origin and destination are the same station (${origin.name}).`,
      };
    }

    try {
      const journeyResult = await this.journeyService.planJourney({
        from: origin.id,
        to: destination.id,
        k: 3,
      });

      if (!journeyResult.candidates || journeyResult.candidates.length === 0) {
        return {
          toolName: 'plan_journey',
          success: false,
          error: `No viable metro route found between ${origin.name} and ${destination.name}.`,
        };
      }

      // Pick top candidate
      const topCandidate = journeyResult.candidates[0];

      // Concise summary for LLM grounding
      const legsSummary = topCandidate.legs.map((leg, idx) => ({
        legIndex: idx + 1,
        mode: leg.mode,
        lineCode: leg.lineCode,
        lineName: leg.lineName,
        fromStation: leg.fromStationName || leg.fromStation?.name || leg.from,
        toStation: leg.toStationName || leg.toStation?.name || leg.to,
        durationMinutes: Math.round(leg.durationSeconds / 60),
        stopsCount: leg.stopsCount || 0,
        direction: leg.direction,
        boardingPlatform: leg.boardingPlatform,
      }));

      const summary = {
        origin: origin.name,
        destination: destination.name,
        originPoi: origin.isPoi
          ? {
              name: origin.poiName,
              snappedTo: origin.name,
              walkDistanceMeters: origin.walkDistanceMeters,
            }
          : null,
        destinationPoi: destination.isPoi
          ? {
              name: destination.poiName,
              snappedTo: destination.name,
              walkDistanceMeters: destination.walkDistanceMeters,
            }
          : null,
        totalDurationMinutes: Math.round(topCandidate.durationSeconds / 60),
        inVehicleMinutes: Math.round(topCandidate.inVehicleSeconds / 60),
        walkingMinutes: Math.round(topCandidate.walkingSeconds / 60),
        waitingMinutes: Math.round(
          topCandidate.waiting?.total?.seconds
            ? topCandidate.waiting.total.seconds / 60
            : 0,
        ),
        transfersCount: topCandidate.transfers,
        fareRupees: topCandidate.fare ?? 20,
        lines: topCandidate.lines,
        attributes: topCandidate.attributes,
        legs: legsSummary,
      };

      return {
        toolName: 'plan_journey',
        success: true,
        data: summary,
        uiPayload: {
          cardType: 'journey',
          data: {
            ...journeyResult,
            selectedCandidate: topCandidate,
          },
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error calculating journey: ${msg}`);
      return {
        toolName: 'plan_journey',
        success: false,
        error: `Journey calculation failed: ${msg}`,
      };
    }
  }

  /**
   * Tool 2: Get live station platform boarding ETAs
   */
  async getLivePlatformEta(
    stationName: string,
    lineCode?: string,
    cityHint?: string,
  ): Promise<ToolExecutionResult> {
    this.logger.log(
      `Executing get_live_platform_eta for station="${stationName}" line="${lineCode || 'all'}"`,
    );

    const station = await this.stationResolver.resolveStation(
      stationName,
      cityHint,
    );
    if (!station) {
      return {
        toolName: 'get_live_platform_eta',
        success: false,
        error: `Could not identify station "${stationName}".`,
      };
    }

    try {
      const boarding = await this.realtimeNetworkService.getLiveStationBoarding(
        station.id,
      );

      const platformsSummary = boarding.platforms.map((p) => ({
        platformNumber: p.platformNumber,
        lineCode: p.lineCode,
        lineName: p.lineName,
        towards: p.towardsStationName,
        trainCount: p.trains.length,
        nextTrains: p.trains.slice(0, 3).map((t) => ({
          etaMinutes: t.etaMinutes,
          delaySeconds: t.delaySeconds,
          status: t.status,
          coaches: t.coaches?.length || 0,
        })),
      }));

      const summary = {
        stationName: station.name,
        city: station.city,
        timestamp: boarding.timestamp,
        platforms: platformsSummary,
      };

      return {
        toolName: 'get_live_platform_eta',
        success: true,
        data: summary,
        uiPayload: {
          cardType: 'live_station',
          data: boarding,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error querying live boarding: ${msg}`);
      return {
        toolName: 'get_live_platform_eta',
        success: false,
        error: `Live telemetry unavailable for ${station.name}: ${msg}`,
      };
    }
  }

  /**
   * Tool 3: Get station layout, accessibility (lifts/escalators), exit gates
   */
  async getStationFacilities(
    stationName: string,
    cityHint?: string,
  ): Promise<ToolExecutionResult> {
    this.logger.log(
      `Executing get_station_facilities for station="${stationName}"`,
    );

    const station = await this.stationResolver.resolveStation(
      stationName,
      cityHint,
    );
    if (!station) {
      return {
        toolName: 'get_station_facilities',
        success: false,
        error: `Could not identify station "${stationName}".`,
      };
    }

    try {
      const digitalTwin = await this.digitalTwinService.getStationDigitalTwin(
        station.id,
      );

      const levels = Array.isArray(digitalTwin.levels)
        ? digitalTwin.levels
        : [];
      const entrances = Array.isArray(digitalTwin.entrances)
        ? digitalTwin.entrances
        : [];
      const amenities = Array.isArray(digitalTwin.amenities)
        ? digitalTwin.amenities
        : [];
      const commercial = Array.isArray(digitalTwin.commercialSpaces)
        ? digitalTwin.commercialSpaces
        : [];

      const summary = {
        stationName: station.name,
        city: station.city,
        levelCount: levels.length,
        entrances: entrances.map((e: Record<string, unknown>) => ({
          name: e.name,
          landmark: e.landmark,
          isAccessible: e.isAccessible,
        })),
        amenities: amenities.map((a: Record<string, unknown>) => ({
          type: a.type,
          name: a.name,
          location: a.locationDescription,
        })),
        outletsCount: commercial.length,
      };

      return {
        toolName: 'get_station_facilities',
        success: true,
        data: summary,
        uiPayload: {
          cardType: 'digital_twin',
          data: digitalTwin,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error querying digital twin: ${msg}`);
      return {
        toolName: 'get_station_facilities',
        success: false,
        error: `Station layout unavailable for ${station.name}: ${msg}`,
      };
    }
  }
}
