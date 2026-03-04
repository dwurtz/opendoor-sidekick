"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type {
  FunctionDeclaration,
  LiveServerMessage,
  Session,
} from "@google/genai";
import { AudioRecorder } from "./audio-recorder";
import { AudioStreamer } from "./audio-streamer";
import { Listing } from "@/lib/opendoor";

export type Status = "disconnected" | "connecting" | "connected";

function fixImageUrl(listing: Listing): Listing {
  if (
    listing.id &&
    (!listing.imageUrl || listing.imageUrl.includes("opendoor.com"))
  ) {
    return { ...listing, imageUrl: `/listings/${listing.id}.jpg` };
  }
  return listing;
}

const SYSTEM_PROMPT = `You are a friendly, knowledgeable real estate assistant named Sidekick, specializing in Opendoor listings in the Phoenix metro area.

Your job is to help users explore current Opendoor home listings. You should:

1. When the conversation starts, greet the user warmly and ask what they're looking for — area, price range, number of bedrooms, etc.

2. Use the "search_listings" tool to fetch current listings. You can filter by location, price range, and number of bedrooms. Always call this tool when the user asks about homes.

3. After fetching listings, summarize the results conversationally — mention the number of homes found, the price range, and highlight a few interesting ones. IMPORTANT: Only discuss the exact listings returned by the tool. Never make up or hallucinate listing details.

4. Use "highlightListing" to show a detailed view when the user asks about a specific property. Use "compareListings" when they want to compare two homes side by side.

5. Be ready to answer follow-up questions about specific listings, compare properties, discuss neighborhoods, or help narrow down choices.

Key guidelines:
- Be conversational and enthusiastic about helping find homes
- Mention specific details: addresses, prices, bed/bath counts, features
- Proactively suggest filters if the user seems unsure
- Keep responses concise for voice — avoid long monologues
- NEVER fabricate listing details — only discuss what the tool returns`;

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_listings",
    description:
      "Search for current Opendoor home listings. Returns homes with prices, addresses, features. Use whenever the user asks about available homes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description:
            'City and state to search, e.g. "Phoenix, AZ" or "Scottsdale, AZ". Default to "Phoenix, AZ" if not specified.',
        },
        min_price: {
          type: Type.NUMBER,
          description: "Minimum price filter (optional)",
        },
        max_price: {
          type: Type.NUMBER,
          description: "Maximum price filter (optional)",
        },
        min_beds: {
          type: Type.NUMBER,
          description: "Minimum number of bedrooms (optional)",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "highlightListing",
    description:
      "Show detailed view of a specific listing. Use when the user asks about a particular property. Pass the street address.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        address: {
          type: Type.STRING,
          description: "The street address of the listing to highlight",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "compareListings",
    description:
      "Show side-by-side comparison of two listings. Use when the user wants to compare two properties.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        address_a: {
          type: Type.STRING,
          description: "Street address of the first listing",
        },
        address_b: {
          type: Type.STRING,
          description: "Street address of the second listing",
        },
      },
      required: ["address_a", "address_b"],
    },
  },
];

export function useGeminiLive() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [highlightedListing, setHighlightedListing] =
    useState<Listing | null>(null);
  const [comparedListings, setComparedListings] = useState<
    [Listing, Listing] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const listingsRef = useRef<Listing[]>([]);

  // Tool call handler — uses refs for current listings state
  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<string> => {
      switch (name) {
        case "search_listings": {
          try {
            const res = await fetch("/api/listings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: args.location,
                min_price: args.min_price ? Number(args.min_price) : undefined,
                max_price: args.max_price ? Number(args.max_price) : undefined,
                min_beds: args.min_beds ? Number(args.min_beds) : undefined,
              }),
            });
            const data = await res.json();
            const listingsArr: Listing[] = data.listings || [];
            const fixed = listingsArr.map(fixImageUrl);
            listingsRef.current = fixed;
            setListings(fixed);

            const lines = fixed.map((l, i) => {
              const parts = [
                `${i + 1}. ${l.address}, ${l.city}, ${l.state} ${l.zip}`,
                `   Price: $${l.price.toLocaleString()} | ${l.beds} bed / ${l.baths} bath / ${l.sqft.toLocaleString()} sqft`,
              ];
              if (l.yearBuilt)
                parts.push(
                  `   Built: ${l.yearBuilt} | Type: ${l.propertyType}`
                );
              if (l.pricePerSqft)
                parts.push(`   Price/sqft: ${l.pricePerSqft}`);
              if (l.lotSize) parts.push(`   Lot: ${l.lotSize}`);
              if (l.garage) parts.push(`   Garage: ${l.garage}`);
              if (l.hoaFees) parts.push(`   HOA: ${l.hoaFees}`);
              if (l.estimatedPayment)
                parts.push(`   Est. payment: ${l.estimatedPayment}`);
              if (l.neighborhood)
                parts.push(`   Neighborhood: ${l.neighborhood}`);
              if (l.schoolDistrict)
                parts.push(`   Schools: ${l.schoolDistrict}`);
              if (l.features) parts.push(`   Features: ${l.features}`);
              if (l.description)
                parts.push(`   ${l.description.slice(0, 200)}`);
              return parts.join("\n");
            });
            return `THESE ARE THE EXACT LISTINGS NOW VISIBLE TO THE USER. Only discuss these specific homes:\n\n${lines.join("\n\n")}`;
          } catch {
            return "Failed to fetch listings.";
          }
        }

        case "highlightListing": {
          const addr = String(args.address || "");
          const found = listingsRef.current.find(
            (l) =>
              l.address.toLowerCase().includes(addr.toLowerCase()) ||
              addr.toLowerCase().includes(l.address.toLowerCase())
          );
          if (found) {
            setHighlightedListing(found);
            setComparedListings(null);
            return "Property detail is now displayed to the user.";
          }
          return "Could not find that listing. Try using the exact street address from the search results.";
        }

        case "compareListings": {
          const find = (a: string) =>
            listingsRef.current.find(
              (l) =>
                l.address.toLowerCase().includes(a.toLowerCase()) ||
                a.toLowerCase().includes(l.address.toLowerCase())
            );
          const a = find(String(args.address_a || ""));
          const b = find(String(args.address_b || ""));
          if (a && b) {
            setComparedListings([a, b]);
            setHighlightedListing(null);
            return "Side-by-side comparison is now displayed to the user.";
          }
          return `Could not find ${!a ? args.address_a : args.address_b}. Try the exact street address.`;
        }

        default:
          return `Unknown tool: ${name}`;
      }
    },
    []
  );

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    // Start recorder IMMEDIATELY in user gesture context (before any await)
    // so the AudioContext isn't auto-suspended by Chrome's autoplay policy.
    const recorder = new AudioRecorder();
    recorderRef.current = recorder;
    try {
      await recorder.start();
    } catch {
      setError("Microphone access is required for voice conversation.");
      setStatus("disconnected");
      return;
    }

    try {
      // Get API key from server
      const res = await fetch("/api/gemini-token");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get API key");

      const ai = new GoogleGenAI({ apiKey: data.apiKey });

      // Set up audio playback
      const streamer = new AudioStreamer();
      streamerRef.current = streamer;
      streamer.onPlaybackStateChange = (playing) => setIsSpeaking(playing);

      // Connect to Gemini Live API
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-latest",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live: connected");
            setStatus("connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Log all message types for debugging
            const keys = Object.keys(message).filter(k => k !== 'constructor');
            if (message.setupComplete) {
              console.log("Gemini: setupComplete");
              // Prompt Gemini to greet the user (no built-in first message like ElevenLabs)
              session.sendClientContent({
                turns: [
                  { role: "user", parts: [{ text: "Hello! I just connected. Please greet me and ask how you can help me find a home." }] },
                ],
                turnComplete: true,
              });
            }
            if (message.serverContent?.turnComplete) console.log("Gemini: turnComplete");
            if (message.serverContent?.interrupted) console.log("Gemini: interrupted");
            if (message.toolCall) console.log("Gemini: toolCall", message.toolCall);

            // Audio output from model
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  console.log("Gemini: received audio, size =", part.inlineData.data.length);
                  streamer.addPCM16(part.inlineData.data);
                }
              }
            }

            // Model was interrupted by user speaking
            if (message.serverContent?.interrupted) {
              streamer.interrupt();
            }

            // Tool calls
            if (message.toolCall?.functionCalls) {
              const responses = [];
              for (const fc of message.toolCall.functionCalls) {
                const result = await handleToolCall(
                  fc.name || "",
                  (fc.args as Record<string, unknown>) || {}
                );
                responses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { output: result },
                });
              }
              session.sendToolResponse({ functionResponses: responses });
            }
          },
          onerror: (err: ErrorEvent) => {
            console.error("Gemini Live error:", err);
            setError("Connection error occurred.");
          },
          onclose: (e: CloseEvent) => {
            console.log("Gemini Live: disconnected", e.code, e.reason);
            setStatus("disconnected");
          },
        },
      });

      sessionRef.current = session;
      console.log("Gemini: session stored, wiring up recorder.onData now");

      // Send each chunk directly
      let sendCount = 0;
      recorder.onData = (base64) => {
        try {
          const s = sessionRef.current;
          if (!s) return;
          if (sendCount++ % 100 === 0) {
            console.log(`Gemini: sent audio chunk #${sendCount}, b64len=${base64.length}`);
          }
          s.sendRealtimeInput({
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (err) {
          console.error("Gemini: send error", err);
        }
      };
    } catch (err) {
      console.error("Gemini connect error:", err);
      recorder.stop();
      setError(
        err instanceof Error ? err.message : "Failed to connect to Gemini"
      );
      setStatus("disconnected");
    }
  }, [handleToolCall]);

  const disconnect = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamerRef.current?.close();
    streamerRef.current = null;
    const s = sessionRef.current;
    sessionRef.current = null;
    try { s?.close(); } catch { /* already closed */ }
    setStatus("disconnected");
    setIsSpeaking(false);
    setHighlightedListing(null);
    setComparedListings(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamerRef.current?.close();
      const s = sessionRef.current;
      sessionRef.current = null;
      try { s?.close(); } catch { /* already closed */ }
    };
  }, []);

  return {
    status,
    isSpeaking,
    listings,
    highlightedListing,
    comparedListings,
    error,
    connect,
    disconnect,
    setHighlightedListing,
    setComparedListings,
  };
}
