import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { AssistantToolsService, ToolExecutionResult } from './assistant-tools.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  toolUsed?: string;
  uiPayload?: {
    cardType: 'journey' | 'live_station' | 'digital_twin' | 'error';
    data: unknown;
  };
}

const SYSTEM_INSTRUCTION = `
You are MetroRadar's Official Transit Voice and Chat Assistant for Mumbai and Delhi Metro systems.
You assist daily commuters, travelers, and tourists navigating rapid transit.

ABSOLUTE GROUNDING & SAFETY DIRECTIVES:
1. NEVER hallucinate, estimate, or guess arrival times, platform numbers, fares, interchange steps, or station sequences.
2. Commuters can provide METRO STATIONS or LOCALITIES / COLONIES / LANDMARKS (e.g., "MHB Colony", "Rameshwaram Cafe Churchgate", "Mithibai College", "BKC", "Powai"). The plan_journey tool automatically snaps any locality, colony, or landmark to its nearest metro station using Google Places.
3. For ANY question involving routes, travel time, fares, live departures, next trains, platforms, or station amenities, you MUST invoke one of your deterministic tools:
   - plan_journey: to find route options, transfer stations, walk durations, and fares between stations or localities.
   - get_live_platform_eta: to find next train departures, platforms, countdowns, and delays.
   - get_station_facilities: to find accessibility (lifts, escalators), gates, and amenities.
4. Once plan_journey returns results:
   - If origin or destination was a locality/POI (e.g. MHB Colony or Rameshwaram Cafe), clearly inform the commuter which nearest metro stations were snapped (e.g., "Board at Borivali (West) metro (~280m walk from MHB Colony) and deboard at Churchgate (~200m from Rameshwaram Cafe)").
   - State the departure platform, line direction/headsign, interchange stations, and walk times.
   - Mention the exact fare (₹) and total travel duration.
5. Keep the spoken reply brief (2 to 4 sentences maximum) suitable for audio readout, because the commuter also receives an interactive visual card with the full itinerary.
6. If a tool reports that a station or route was not found, inform the commuter accurately. Never make up alternative schedules.
7. Support English, Hindi, and Marathi queries naturally.
`;

const PLAN_JOURNEY_DECLARATION: FunctionDeclaration = {
  name: 'plan_journey',
  description: 'Calculates the fastest or fewest-transfer transit route between two metro stations, colonies, localities, or landmarks. Automatically snaps localities to nearest metro stations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      originStation: {
        type: Type.STRING,
        description: 'Name of origin station, locality, colony, or landmark (e.g. MHB Colony, Borivali, Ghatkopar, Gundavali, WEH, BKC)',
      },
      destinationStation: {
        type: Type.STRING,
        description: 'Name of destination station, locality, or landmark (e.g. Rameshwaram Cafe Churchgate, BKC, Airport T2, Andheri West, CSMT)',
      },
      preference: {
        type: Type.STRING,
        enum: ['fastest', 'fewest_transfers', 'least_walking'],
        description: 'Commuter preference (optional)',
      },
    },
    required: ['originStation', 'destinationStation'],
  },
};

const GET_LIVE_ETA_DECLARATION: FunctionDeclaration = {
  name: 'get_live_platform_eta',
  description: 'Fetches real-time live incoming trains, platform countdowns, delays, and line status for a specific station.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      stationName: {
        type: Type.STRING,
        description: 'Name of the station (e.g. Gundavali, Andheri West, Ghatkopar)',
      },
      lineCode: {
        type: Type.STRING,
        description: 'Optional line code filter (e.g. Line 1, Line 2A, Line 7)',
      },
    },
    required: ['stationName'],
  },
};

const GET_STATION_FACILITIES_DECLARATION: FunctionDeclaration = {
  name: 'get_station_facilities',
  description: 'Provides physical digital twin details for a station: accessibility (lifts/escalators), exit gates, and amenities.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      stationName: {
        type: Type.STRING,
        description: 'Name of the station to inspect',
      },
    },
    required: ['stationName'],
  },
};

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly aiClient: GoogleGenAI | null = null;
  private readonly apiKey: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly toolsService: AssistantToolsService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || null;
    if (this.apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
        this.logger.log('Gemini AI Client initialized successfully for AI Assistant Gateway.');
      } catch (err) {
        this.logger.warn(`Failed to initialize GoogleGenAI: ${err}`);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not configured. Running AI Assistant in Deterministic Rule & Regex Fallback Mode.',
      );
    }
  }

  /**
   * Main conversational interface for text & voice intents
   */
  async processCommuterQuery(
    userMessage: string,
    cityHint?: string,
    history: ChatMessage[] = [],
  ): Promise<AssistantChatResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      return { reply: 'Hello! How can I help you navigate the metro today?' };
    }

    // 1. If Gemini API is available, use Tool-Calling Multi-turn generation
    if (this.aiClient) {
      try {
        return await this.processWithGemini(trimmed, cityHint, history);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Gemini generation failed: ${msg}. Falling back to deterministic rule engine.`);
      }
    }

    // 2. Deterministic Rule & Regex Fallback (works offline with zero keys)
    return await this.processWithRuleFallback(trimmed, cityHint);
  }

  /**
   * Gemini 2.0 Flash Tool-Calling Engine
   */
  private async processWithGemini(
    userMessage: string,
    cityHint?: string,
    history: ChatMessage[] = [],
  ): Promise<AssistantChatResponse> {
    const model = 'gemini-2.0-flash';

    // Format chat contents
    const contents: Array<{ role: string; parts: Array<{ text?: string }> }> = [];

    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Current turn
    const contextPrefix = cityHint ? `[Commuter City Context: ${cityHint}] ` : '';
    contents.push({
      role: 'user',
      parts: [{ text: `${contextPrefix}${userMessage}` }],
    });

    const response = await this.aiClient!.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              PLAN_JOURNEY_DECLARATION,
              GET_LIVE_ETA_DECLARATION,
              GET_STATION_FACILITIES_DECLARATION,
            ],
          },
        ],
        temperature: 0.2, // Low temperature for high transit precision
      },
    });

    // Check for function calls
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolName = call.name;
      const args = (call.args || {}) as Record<string, any>;

      let toolResult: ToolExecutionResult;
      if (toolName === 'plan_journey') {
        toolResult = await this.toolsService.planJourney(
          args.originStation,
          args.destinationStation,
          args.preference,
          cityHint,
        );
      } else if (toolName === 'get_live_platform_eta') {
        toolResult = await this.toolsService.getLivePlatformEta(
          args.stationName,
          args.lineCode,
          cityHint,
        );
      } else if (toolName === 'get_station_facilities') {
        toolResult = await this.toolsService.getStationFacilities(
          args.stationName,
          cityHint,
        );
      } else {
        toolResult = {
          toolName: toolName || 'unknown_tool',
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
      }

      // Submit tool output back to Gemini to synthesize commuter advice
      const followUp = await this.aiClient!.models.generateContent({
        model,
        contents: [
          ...contents,
          {
            role: 'model',
            parts: [{ functionCall: call }],
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: { result: toolResult.data || toolResult.error },
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        },
      });

      return {
        reply: followUp.text || 'Here is the transit information for your trip.',
        toolUsed: toolName,
        uiPayload: toolResult.uiPayload,
      };
    }

    return {
      reply: response.text || 'I could not find that transit information. Could you specify origin and destination?',
    };
  }

  /**
   * Deterministic fallback when Gemini API key is missing or offline
   */
  private async processWithRuleFallback(
    message: string,
    cityHint?: string,
  ): Promise<AssistantChatResponse> {
    const lower = message.toLowerCase();

    // 1. Check for "to / from" journey pattern
    // e.g. "How to reach BKC from Borivali", "i want to go from mhb colony to rameshwaram cafe in churchgate", "Borivali to Gundavali"
    const fromToMatch =
      message.match(/(?:from|starting\s+at)\s+([a-zA-Z0-9\s.,'-]+?)\s+(?:to|towards)\s+([a-zA-Z0-9\s.,'-]+)/i) ||
      message.match(/(?:reach|go\s+to|visit)\s+([a-zA-Z0-9\s.,'-]+?)\s+from\s+([a-zA-Z0-9\s.,'-]+)/i) ||
      message.match(/([a-zA-Z0-9\s.,'-]+?)\s+(?:to|->)\s+([a-zA-Z0-9\s.,'-]+)/i);

    if (fromToMatch) {
      let origin: string;
      let destination: string;

      if (lower.includes('reach') || lower.includes('go to')) {
        destination = fromToMatch[1].trim();
        origin = fromToMatch[2].trim();
      } else {
        origin = fromToMatch[1].trim();
        destination = fromToMatch[2].trim();
      }

      const res = await this.toolsService.planJourney(origin, destination, 'fastest', cityHint);
      if (res.success && res.data) {
        const d = res.data as any;
        let poiNote = '';
        if (d.originPoi && d.destinationPoi) {
          poiNote = ` Board at ${d.originPoi.snappedTo} (~${d.originPoi.walkDistanceMeters}m from ${d.originPoi.name}) and deboard at ${d.destinationPoi.snappedTo} (~${d.destinationPoi.walkDistanceMeters}m from ${d.destinationPoi.name}).`;
        } else if (d.originPoi) {
          poiNote = ` Board at ${d.originPoi.snappedTo} (~${d.originPoi.walkDistanceMeters}m from ${d.originPoi.name}).`;
        } else if (d.destinationPoi) {
          poiNote = ` Deboard at ${d.destinationPoi.snappedTo} (~${d.destinationPoi.walkDistanceMeters}m from ${d.destinationPoi.name}).`;
        }

        const reply = `Take the metro from ${d.origin} to ${d.destination}.${poiNote} Total travel time is ~${d.totalDurationMinutes} minutes with ${d.transfersCount} interchange(s). Standard fare is ₹${d.fareRupees}.`;
        return {
          reply,
          toolUsed: 'plan_journey',
          uiPayload: res.uiPayload,
        };
      }
      return {
        reply: res.error || `I couldn't calculate a route between ${origin} and ${destination}.`,
      };
    }

    // 2. Check for live platform / train status pattern
    // e.g. "Next train at Gundavali", "Live train at Andheri"
    const liveMatch =
      message.match(/(?:next train|when is next train|live train|trains at|status at|platform at)\s+(?:at\s+)?([a-zA-Z0-9\s.]+)/i) ||
      message.match(/([a-zA-Z0-9\s.]+?)\s+(?:next train|live platform|train times)/i);

    if (liveMatch) {
      const station = liveMatch[1].trim();
      const res = await this.toolsService.getLivePlatformEta(station, undefined, cityHint);
      if (res.success && res.data) {
        const d = res.data as any;
        const p0 = d.platforms && d.platforms[0];
        const nextT = p0?.nextTrains && p0.nextTrains[0];
        const etaText = nextT ? `in ~${nextT.etaMinutes} min` : 'scheduled soon';
        const reply = `Live at ${d.stationName}: Platform ${p0?.platformNumber || '1'} (${p0?.towards || 'Terminal'}) train arrives ${etaText}.`;
        return {
          reply,
          toolUsed: 'get_live_platform_eta',
          uiPayload: res.uiPayload,
        };
      }
      return {
        reply: res.error || `Could not find live departures for ${station}.`,
      };
    }

    // 3. Check for facility / accessibility query
    // e.g. "Is Gundavali wheelchair accessible?", "Lifts at Andheri"
    const facilityMatch =
      message.match(/(?:wheelchair|lift|escalator|gate|amenities|facility)\s+(?:at|in)\s+([a-zA-Z0-9\s.]+)/i) ||
      message.match(/is\s+([a-zA-Z0-9\s.]+?)\s+(?:wheelchair accessible|accessible)/i);

    if (facilityMatch) {
      const station = facilityMatch[1].trim();
      const res = await this.toolsService.getStationFacilities(station, cityHint);
      if (res.success && res.data) {
        const d = res.data as any;
        const reply = `${d.stationName} has ${d.entrances.length} gates, accessibility amenities, and ${d.levelCount} levels.`;
        return {
          reply,
          toolUsed: 'get_station_facilities',
          uiPayload: res.uiPayload,
        };
      }
      return {
        reply: res.error || `Could not find station facilities for ${station}.`,
      };
    }

    return {
      reply:
        "I am MetroRadar's Transit Assistant. You can ask me:\n• 'Fastest route from Ghatkopar to Airport?'\n• 'When is the next train at Gundavali?'\n• 'Is Andheri West wheelchair accessible?'",
    };
  }
}
