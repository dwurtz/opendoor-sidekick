import { NextRequest, NextResponse } from "next/server";
import { fetchListings, formatAllListingsForAgent } from "@/lib/opendoor";

// This endpoint serves as the webhook for the ElevenLabs agent's server tool.
// The agent calls this to search for Opendoor listings.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const location =
      body.location ||
      body.city ||
      process.env.OPENDOOR_LOCATION ||
      "Phoenix, AZ";
    const minPrice = body.min_price ? Number(body.min_price) : undefined;
    const maxPrice = body.max_price ? Number(body.max_price) : undefined;
    const minBeds = body.min_beds ? Number(body.min_beds) : undefined;

    let listings = await fetchListings(location);

    // Apply filters
    if (minPrice) listings = listings.filter((l) => l.price >= minPrice);
    if (maxPrice) listings = listings.filter((l) => l.price <= maxPrice);
    if (minBeds) listings = listings.filter((l) => l.beds >= minBeds);

    const summary = formatAllListingsForAgent(listings);

    return NextResponse.json({
      location,
      count: listings.length,
      summary,
      listings,
    });
  } catch (error) {
    console.error("Listings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET(req: NextRequest) {
  const location =
    req.nextUrl.searchParams.get("location") ||
    process.env.OPENDOOR_LOCATION ||
    "Phoenix, AZ";

  const listings = await fetchListings(location);
  return NextResponse.json({ location, count: listings.length, listings });
}
