"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef, useState } from "react";
import { Listing } from "@/lib/opendoor";
import { ListingsPanel } from "./ListingsPanel";
import { PropertyDetail } from "./PropertyDetail";
import { CompareView } from "./CompareView";

function fixImageUrl(listing: Listing): Listing {
  if (listing.id && (!listing.imageUrl || listing.imageUrl.includes("opendoor.com"))) {
    return { ...listing, imageUrl: `/listings/${listing.id}.jpg` };
  }
  return listing;
}

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
  const listingsRef = useRef<Listing[]>([]);
  const [highlightedListing, setHighlightedListing] = useState<Listing | null>(null);
  const [comparedListings, setComparedListings] = useState<[Listing, Listing] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      setError(null);
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
      setHighlightedListing(null);
      setComparedListings(null);
    },
    onError: (err) => {
      console.error("Conversation error:", err);
      setError(String(err));
    },
    onMessage: (message) => {
      console.log("Message:", message);
    },
    clientTools: {
      // Single tool: fetches from our API AND displays — no webhook needed
      search_listings: async (params: {
        location?: string;
        min_price?: string;
        max_price?: string;
        min_beds?: string;
      }) => {
        try {
          const res = await fetch("/api/listings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: params.location,
              min_price: params.min_price ? Number(params.min_price) : undefined,
              max_price: params.max_price ? Number(params.max_price) : undefined,
              min_beds: params.min_beds ? Number(params.min_beds) : undefined,
            }),
          });
          const data = await res.json();
          const listingsArr: Listing[] = data.listings || [];
          const fixed = listingsArr.map(fixImageUrl);
          listingsRef.current = fixed;
          setListings(fixed);
          // Detailed summary so the LLM has no reason to hallucinate
          const lines = fixed.map(
            (l, i) => {
              const parts = [
                `${i + 1}. ${l.address}, ${l.city}, ${l.state} ${l.zip}`,
                `   Price: $${l.price.toLocaleString()} | ${l.beds} bed / ${l.baths} bath / ${l.sqft.toLocaleString()} sqft`,
              ];
              if (l.yearBuilt) parts.push(`   Built: ${l.yearBuilt} | Type: ${l.propertyType}`);
              if (l.pricePerSqft) parts.push(`   Price/sqft: ${l.pricePerSqft}`);
              if (l.lotSize) parts.push(`   Lot: ${l.lotSize}`);
              if (l.garage) parts.push(`   Garage: ${l.garage}`);
              if (l.hoaFees) parts.push(`   HOA: ${l.hoaFees}`);
              if (l.estimatedPayment) parts.push(`   Est. payment: ${l.estimatedPayment}`);
              if (l.neighborhood) parts.push(`   Neighborhood: ${l.neighborhood}`);
              if (l.schoolDistrict) parts.push(`   Schools: ${l.schoolDistrict}`);
              if (l.features) parts.push(`   Features: ${l.features}`);
              if (l.description) parts.push(`   ${l.description.slice(0, 200)}`);
              return parts.join("\n");
            }
          );
          return `THESE ARE THE EXACT LISTINGS NOW VISIBLE TO THE USER. Only discuss these specific homes:\n\n${lines.join("\n\n")}`;
        } catch {
          return "Failed to fetch listings.";
        }
      },
      highlightListing: async (params: { address: string }) => {
        const found = listingsRef.current.find(
          (l) => l.address.toLowerCase().includes(params.address.toLowerCase())
            || params.address.toLowerCase().includes(l.address.toLowerCase())
        );
        if (found) {
          setHighlightedListing(found);
          setComparedListings(null);
          return "Property detail is now displayed to the user.";
        }
        return "Could not find that listing. Try using the exact street address from the search results.";
      },
      compareListings: async (params: { address_a: string; address_b: string }) => {
        const find = (addr: string) =>
          listingsRef.current.find(
            (l) => l.address.toLowerCase().includes(addr.toLowerCase())
              || addr.toLowerCase().includes(l.address.toLowerCase())
          );
        const a = find(params.address_a);
        const b = find(params.address_b);
        if (a && b) {
          setComparedListings([a, b]);
          setHighlightedListing(null);
          return "Side-by-side comparison is now displayed to the user.";
        }
        return `Could not find ${!a ? params.address_a : params.address_b}. Try the exact street address.`;
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
      <div className={listings.length > 0 || highlightedListing || comparedListings ? "lg:w-[400px] lg:flex-shrink-0" : "max-w-xl mx-auto w-full"}>
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

      {/* Property Detail / Compare / Listings Panel */}
      {(highlightedListing || comparedListings || listings.length > 0) && (
        <div className="flex-1 min-w-0 space-y-6">
          {comparedListings && (
            <CompareView
              listings={comparedListings}
              onClose={() => setComparedListings(null)}
            />
          )}
          {!comparedListings && highlightedListing && (
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
