import { NextResponse } from "next/server";

export async function GET() {
  const agentId = process.env.AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || agentId === "your_agent_id_here") {
    return NextResponse.json(
      { error: "AGENT_ID not configured. Run `npx tsx scripts/setup-agent.ts` first." },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey === "your_elevenlabs_api_key_here") {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("ElevenLabs signed URL error:", text);
      return NextResponse.json(
        { error: "Failed to get signed URL from ElevenLabs" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
