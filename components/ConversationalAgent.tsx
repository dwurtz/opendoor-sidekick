"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";
import { Listing } from "@/lib/opendoor";
import { ListingsPanel } from "./ListingsPanel";
import { PropertyDetail } from "./PropertyDetail";

async function getSignedUrl(): Promise<string> {
  const res = await fetch("/api/signed-url");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to get signed URL");
  }
  const data = await res.json();
  return data.signedUrl;
}

export function ConversationalAgent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [highlightedListing, setHighlightedListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      setError(null);
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
      setHighlightedListing(null);
    },
    onError: (err) => {
      console.error("Conversation error:", err);
      setError(String(err));
    },
    onMessage: (message) => {
      console.log("Message:", message);
    },
    clientTools: {
      displayListings: async (params: { listings_json: string }) => {
        try {
          const parsed = JSON.parse(params.listings_json);
          const listingsArr = Array.isArray(parsed)
            ? parsed
            : parsed.listings || [];
          setListings(listingsArr);
          return `Displayed ${listingsArr.length} listings to the user.`;
        } catch {
          return "Failed to parse listings data.";
        }
      },
      highlightListing: async (params: { listing_json: string }) => {
        try {
          const parsed = JSON.parse(params.listing_json);
          setHighlightedListing(parsed);
          return "Property detail is now displayed to the user.";
        } catch {
          return "Failed to parse listing data.";
        }
      },
    },
  });

  const startConversation = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is required for voice conversation.");
      return;
    }

    try {
      const signedUrl = await getSignedUrl();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation"
      );
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Voice Agent Panel */}
      <div className={listings.length > 0 || highlightedListing ? "lg:w-[400px] lg:flex-shrink-0" : "max-w-xl mx-auto w-full"}>
        <div className="bg-white rounded-2xl border border-od-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-10">
          {/* Status Orb */}
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative">
              <div
                className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isConnected
                    ? conversation.isSpeaking
                      ? "bg-od-blue voice-pulse"
                      : "bg-od-blue voice-ripple"
                    : isConnecting
                      ? "bg-od-gray-300 animate-pulse"
                      : "bg-od-gray-100"
                }`}
              >
                {isConnected ? (
                  conversation.isSpeaking ? (
                    <SpeakingIcon />
                  ) : (
                    <ListeningIcon />
                  )
                ) : isConnecting ? (
                  <ConnectingIcon />
                ) : (
                  <MicIcon />
                )}
              </div>
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-od-green rounded-full border-[3px] border-white" />
              )}
            </div>

            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-od-dark">
                {isConnected
                  ? conversation.isSpeaking
                    ? "Sidekick is speaking..."
                    : "Listening..."
                  : isConnecting
                    ? "Connecting..."
                    : "Ready to chat"}
              </h2>
              <p className="text-[14px] text-od-gray-500 mt-1.5">
                {isConnected
                  ? "Ask about homes, prices, or neighborhoods"
                  : "Start a voice conversation with Sidekick"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isConnected ? (
              <button
                onClick={startConversation}
                disabled={isConnecting}
                className="w-full px-6 py-3.5 bg-od-blue hover:bg-od-blue-hover disabled:bg-od-gray-300 text-white text-[16px] font-medium rounded-xl transition-colors"
              >
                {isConnecting ? "Connecting..." : "Start conversation"}
              </button>
            ) : (
              <button
                onClick={stopConversation}
                className="w-full px-6 py-3.5 bg-white hover:bg-od-gray-50 text-od-dark text-[16px] font-medium rounded-xl border border-od-gray-300 transition-colors"
              >
                End conversation
              </button>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-od-red text-[14px]">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Property Detail + Listings Panel */}
      {(highlightedListing || listings.length > 0) && (
        <div className="flex-1 min-w-0 space-y-6">
          {highlightedListing && (
            <PropertyDetail
              listing={highlightedListing}
              onClose={() => setHighlightedListing(null)}
            />
          )}
          {listings.length > 0 && <ListingsPanel listings={listings} />}
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-14 h-14 text-od-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function ListeningIcon() {
  return (
    <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function SpeakingIcon() {
  return (
    <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  );
}

function ConnectingIcon() {
  return (
    <svg className="w-14 h-14 text-od-gray-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644L6.166 16.46" />
    </svg>
  );
}
