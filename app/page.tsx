import { ConversationalAgent } from "@/components/ConversationalAgent";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header — Opendoor style */}
      <header className="sticky top-0 z-50 bg-white border-b border-od-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Opendoor-style logo */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0040E6" />
              <path
                d="M10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M16 22V16H22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[20px] font-semibold text-od-dark tracking-tight">
              Opendoor
            </span>
            <span className="text-[13px] font-medium text-od-blue bg-od-blue-light px-2.5 py-0.5 rounded-full">
              Sidekick
            </span>
          </div>
          <p className="text-[14px] text-od-gray-500 hidden sm:block">
            AI-powered home search
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-[40px] font-bold text-od-dark tracking-tight leading-tight mb-4">
            Find your next home
          </h1>
          <p className="text-[18px] text-od-gray-700 max-w-lg mx-auto leading-relaxed">
            Talk to your AI assistant about Opendoor listings.
            Ask about prices, features, neighborhoods, and more.
          </p>
        </div>

        <ConversationalAgent />
      </main>
    </div>
  );
}
