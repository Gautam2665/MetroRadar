"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, Sparkles, X, Volume2, VolumeX, Train, Compass, ArrowRight } from "lucide-react";
import { useCityContext } from "../contexts/CityContext";
import { useJourneyContext } from "../contexts/JourneyContext";
import { useStationContext } from "../contexts/StationContext";
import { useAssistantUi } from "../contexts/AssistantUiContext";
import { sendAssistantMessage, ChatMessage } from "../services/api/assistant.api";

interface MessageItem extends ChatMessage {
  id: string;
  toolUsed?: string;
  uiPayload?: any;
}

export function AiAssistantDrawer() {
  const router = useRouter();
  const { isOpen, closeAssistant, initialPrompt, clearInitialPrompt } = useAssistantUi();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "Namaste! I am TransitOS AI Co-Pilot. Ask me route advice, accessible gates, inter-line transfers, or station exits in English, Hindi, or Marathi.",
    },
  ]);

  const { activeCity } = useCityContext();
  const { setOrigin, setDestination, setJourneyGeojson } = useJourneyContext();
  const { setSelectedStation } = useStationContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialPrompt && !isLoading) {
      const promptToRun = initialPrompt;
      clearInitialPrompt();
      handleSubmit(promptToRun);
    }
  }, [isOpen, initialPrompt]);

  // Initialize browser SpeechRecognition if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput(transcript);
            handleSubmit(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [activeCity]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge or type your question.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start recognition", err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!isSpeakingEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput("");
    const userMsgId = Date.now().toString();
    const userMsg: MessageItem = { id: userMsgId, role: "user", content: query };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history: ChatMessage[] = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAssistantMessage(query, activeCity, history);

      const assistantMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
        toolUsed: res.toolUsed,
        uiPayload: res.uiPayload,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(res.reply);

      // Handle interactive UI payload linking
      if (res.uiPayload?.cardType === "journey" && res.uiPayload.data) {
        const d = res.uiPayload.data;
        const topCandidate = d.selectedCandidate || (d.candidates && d.candidates[0]);
        if (topCandidate) {
          if (topCandidate.origin) {
            setOrigin({
              id: topCandidate.origin.id,
              name: topCandidate.origin.name,
              code: topCandidate.origin.code || "",
              line: topCandidate.lines?.[0] || "Metro",
              lineColor: "#00e5ff",
              city: activeCity,
              systemId: "",
              coordinates: [72.85, 19.11],
            });
          }
          if (topCandidate.destination) {
            setDestination({
              id: topCandidate.destination.id,
              name: topCandidate.destination.name,
              code: topCandidate.destination.code || "",
              line: topCandidate.lines?.[topCandidate.lines.length - 1] || "Metro",
              lineColor: "#00e5ff",
              city: activeCity,
              systemId: "",
              coordinates: [72.85, 19.11],
            });
          }
          const routeGeo = topCandidate.geojson || d.geojson;
          if (routeGeo) {
            setJourneyGeojson(routeGeo);
          }
        }
      } else if (res.uiPayload?.cardType === "live_station" && res.uiPayload.data) {
        const s = res.uiPayload.data;
        if (s.stationId && s.stationName) {
          setSelectedStation(s.stationId, s.stationName);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I had trouble connecting to the transit gateway. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Slide-over Drawer (toggled from header menu bar) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 md:right-8 z-50 w-[380px] sm:w-[420px] max-h-[640px] h-[82vh] flex flex-col rounded-2xl bg-[#0b101b]/95 backdrop-blur-xl border border-[#00e5ff]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e5ff] to-[#7000ff] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">MetroRadar AI Assistant</h3>
                <p className="text-[11px] text-[#00e5ff] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
                  Deterministic Transit Gateway
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSpeakingEnabled((prev) => !prev)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title={isSpeakingEnabled ? "Mute Voice Readout" : "Enable Voice Readout"}
              >
                {isSpeakingEnabled ? <Volume2 className="w-4 h-4 text-[#00e5ff]" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={closeAssistant}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[11px]">
            <button
              onClick={() => handleSubmit("Fastest route from Ghatkopar to Airport?")}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            >
              ⚡ Ghatkopar to Airport
            </button>
            <button
              onClick={() => handleSubmit("Next train at Gundavali?")}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            >
              🚇 Next train Gundavali
            </button>
            <button
              onClick={() => handleSubmit("Is Andheri West wheelchair accessible?")}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            >
              ♿ Andheri Lifts
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => {
              const isAssistant = m.role === "assistant";
              return (
                <div key={m.id} className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isAssistant
                        ? "bg-white/10 text-white border border-white/10 rounded-tl-sm shadow-md"
                        : "bg-gradient-to-r from-[#00e5ff] to-[#0099ff] text-black font-medium rounded-tr-sm"
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Journey UI Card */}
                  {isAssistant && m.uiPayload?.cardType === "journey" && (
                    <div className="mt-2 w-[90%] p-3.5 rounded-xl bg-white/5 border border-[#00e5ff]/30 text-xs text-white space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between text-[11px] text-[#00e5ff] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Train className="w-3.5 h-3.5" /> Metro Route
                        </span>
                        <span className="bg-[#00e5ff]/10 text-[#00e5ff] px-2 py-0.5 rounded-full border border-[#00e5ff]/30">
                          ₹{m.uiPayload.data?.selectedCandidate?.fare ?? 20}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/90 font-medium">
                        <span className="truncate max-w-[45%]">{m.uiPayload.data?.selectedCandidate?.origin?.name}</span>
                        <span className="text-[#00e5ff] font-bold">→</span>
                        <span className="truncate max-w-[45%] text-right">{m.uiPayload.data?.selectedCandidate?.destination?.name}</span>
                      </div>

                      <div className="text-[11px] text-white/60 flex items-center justify-between border-t border-white/5 pt-1.5">
                        <span>~{Math.round((m.uiPayload.data?.selectedCandidate?.durationSeconds || 0) / 60)} min</span>
                        <span>{m.uiPayload.data?.selectedCandidate?.transfers || 0} transfer(s)</span>
                      </div>

                      {/* Redirect to Plan Journey with full turn-by-turn details */}
                      <button
                        onClick={() => {
                          const origName =
                            m.uiPayload.data?.origin ||
                            m.uiPayload.data?.selectedCandidate?.origin?.name ||
                            "";
                          const destName =
                            m.uiPayload.data?.destination ||
                            m.uiPayload.data?.selectedCandidate?.destination?.name ||
                            "";
                          const origId =
                            m.uiPayload.data?.selectedCandidate?.origin?.id || "";
                          const destId =
                            m.uiPayload.data?.selectedCandidate?.destination?.id || "";
                          closeAssistant();
                          router.push(
                            `/plan?from=${encodeURIComponent(origName)}&to=${encodeURIComponent(destName)}&originId=${encodeURIComponent(origId)}&destId=${encodeURIComponent(destId)}`
                          );
                        }}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#00e5ff] to-[#0099ff] hover:from-[#33ebff] hover:to-[#1aa3ff] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all cursor-pointer"
                      >
                        <span>View Detailed Journey</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Live Station Boarding Card */}
                  {isAssistant && m.uiPayload?.cardType === "live_station" && (
                    <div className="mt-2 w-[90%] p-3 rounded-xl bg-white/5 border border-[#7000ff]/30 text-xs text-white space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#d1bcff] font-semibold">
                        <span className="flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" /> Live Platform Boarding
                        </span>
                        <span>{m.uiPayload.data?.stationName}</span>
                      </div>
                      {m.uiPayload.data?.platforms?.slice(0, 2).map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-white/5 p-1.5 rounded">
                          <span>Plat. {p.platformNumber} ({p.lineCode})</span>
                          <span className="text-[#00e5ff] font-bold">
                            {p.trains?.[0] ? `${p.trains[0].etaMinutes} min` : "Scheduled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#00e5ff] py-1">
                <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
                <span>Consulting deterministic transit router...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 border-t border-white/10 bg-white/5 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title={isListening ? "Listening... Tap to stop" : "Tap to speak"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={isListening ? "Listening to your voice..." : "Ask transit advice or station ETA..."}
              className="flex-1 bg-white/10 text-white text-xs px-3.5 py-2.5 rounded-full border border-white/10 placeholder-white/40 focus:outline-none focus:border-[#00e5ff]"
            />

            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-full bg-[#00e5ff] text-black font-semibold disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
