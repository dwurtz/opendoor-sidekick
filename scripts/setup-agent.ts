/**
 * Setup script to create the ElevenLabs Conversational AI agent.
 *
 * Usage:
 *   1. Set ELEVENLABS_API_KEY in .env.local
 *   2. Run: npx tsx scripts/setup-agent.ts
 *   3. Copy the returned agent ID into .env.local as AGENT_ID
 *
 * The agent is configured with:
 *   - A real estate assistant prompt
 *   - A server tool (webhook) to fetch Opendoor listings
 *   - A client tool to display listings in the browser UI
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const LOCATION = process.env.OPENDOOR_LOCATION || "Phoenix, AZ";

if (!API_KEY || API_KEY === "your_elevenlabs_api_key_here") {
  console.error("ERROR: Set ELEVENLABS_API_KEY in .env.local first.");
  process.exit(1);
}

const AGENT_PROMPT = `You are a friendly, knowledgeable real estate assistant specializing in Opendoor listings. Your name is Sidekick.

Your job is to help users explore current Opendoor home listings in their area. You should:

1. When the conversation starts, greet the user warmly and ask what area they're interested in, or if they'd like to see listings in ${LOCATION}.

2. Use the "search_listings" tool to fetch current listings. You can filter by location, price range, and number of bedrooms.

3. After fetching listings, summarize the results conversationally — mention the number of homes found, the price range, and highlight a few interesting ones. Use the "displayListings" client tool to show the listings visually in the user's browser.

4. Be ready to answer follow-up questions about specific listings, compare properties, discuss neighborhoods, or help narrow down choices.

5. If asked about the home buying process with Opendoor, explain that Opendoor lets you buy homes online with virtual tours, competitive pricing, and a streamlined closing process.

Key guidelines:
- Be conversational and enthusiastic about helping find homes
- Mention specific details like addresses, prices, bed/bath counts
- Proactively suggest filters if the user seems unsure (e.g., "Would you like to narrow it down by price range or number of bedrooms?")
- If listings seem to be demo data, still discuss them naturally
- Keep responses concise for voice — avoid long monologues`;

async function createAgent() {
  console.log("Creating ElevenLabs Conversational AI agent...\n");

  const body = {
    name: "Opendoor Sidekick",
    conversation_config: {
      agent: {
        first_message: `Hey there! I'm Sidekick, your Opendoor real estate assistant. I can help you explore homes for sale in your area. Would you like to see what's available in ${LOCATION}, or do you have a different area in mind?`,
        language: "en",
        prompt: {
          prompt: AGENT_PROMPT,
          llm: "gemini-2.0-flash",
          temperature: 0.7,
          max_tokens: -1,
          tools: [
            {
              type: "webhook",
              name: "search_listings",
              description:
                "Search for current Opendoor home listings in a given area. Returns a list of homes with prices, addresses, features, and descriptions. Use this whenever the user asks about available homes or listings.",
              api_schema: {
                url: `${APP_URL}/api/listings`,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                request_body_schema: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description:
                        'The city and state to search, e.g. "Phoenix, AZ" or "Austin, TX"',
                    },
                    min_price: {
                      type: "number",
                      description: "Minimum price filter (optional)",
                    },
                    max_price: {
                      type: "number",
                      description: "Maximum price filter (optional)",
                    },
                    min_beds: {
                      type: "number",
                      description:
                        "Minimum number of bedrooms filter (optional)",
                    },
                  },
                  required: ["location"],
                },
              },
            },
            {
              type: "client",
              name: "displayListings",
              description:
                "Display the listings visually in the user's browser. Call this after you fetch listings so the user can see them on screen. Pass the full listings JSON array.",
              parameters: {
                type: "object",
                properties: {
                  listings_json: {
                    type: "string",
                    description:
                      "JSON string of the listings array to display in the UI",
                  },
                },
                required: ["listings_json"],
              },
              wait_for_response: true,
            },
          ],
        },
      },
      tts: {
        model_id: "eleven_flash_v2",
        voice_id: "cjVigY5qzO86Huf0OWal", // "Eric" - friendly male voice
        stability: 0.5,
        speed: 1.05,
        similarity_boost: 0.8,
      },
      asr: {
        quality: "high",
        provider: "elevenlabs",
        keywords: [
          "Opendoor",
          "listing",
          "listings",
          "bedroom",
          "bathroom",
          "sqft",
          "square feet",
        ],
      },
      turn: {
        turn_timeout: 7,
        turn_eagerness: "normal",
      },
      conversation: {
        text_only: false,
        max_duration_seconds: 600,
      },
    },
    platform_settings: {
      widget: {
        variant: "compact",
        feedback_mode: "during",
        transcript_enabled: true,
        text_input_enabled: true,
      },
    },
  };

  const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/agents/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY!,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create agent (${response.status}):`);
    console.error(errorText);
    process.exit(1);
  }

  const agent = await response.json();

  console.log("Agent created successfully!");
  console.log(`\n  Agent ID: ${agent.agent_id}`);
  console.log(`  Name: Opendoor Sidekick`);
  console.log(`\nNext steps:`);
  console.log(`  1. Add this to your .env.local:`);
  console.log(`     AGENT_ID=${agent.agent_id}`);
  console.log(`  2. Run: npm run dev`);
  console.log(`  3. Open http://localhost:3000 and click "Start Conversation"\n`);

  // Note about webhook URL
  if (APP_URL.includes("localhost")) {
    console.log(
      "NOTE: The agent's search_listings tool points to localhost."
    );
    console.log(
      "For the webhook to work, you need to either:"
    );
    console.log(
      "  a) Use ngrok to expose localhost (ngrok http 3000) and update the agent, or"
    );
    console.log(
      "  b) The agent will still work but listing search may fail from ElevenLabs' servers."
    );
    console.log(
      "  c) The demo listings are baked into the agent prompt as fallback.\n"
    );
  }
}

createAgent();
