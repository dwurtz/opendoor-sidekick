export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  url: string;
  imageUrl?: string;
  status: string;
  propertyType: string;
  description?: string;
}

const OPENDOOR_SEARCH_URL = "https://www.opendoor.com/homes";

/**
 * Fetches Opendoor listings for a given location.
 * Scrapes the public Opendoor website search results.
 * Falls back to demo data if scraping fails.
 */
export async function fetchListings(location: string): Promise<Listing[]> {
  try {
    const slug = location
      .toLowerCase()
      .replace(/,\s*/g, "-")
      .replace(/\s+/g, "-");

    const url = `${OPENDOOR_SEARCH_URL}/${slug}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`Opendoor fetch failed (${res.status}), using demo data`);
      return getDemoListings(location);
    }

    const html = await res.text();

    // Try to extract __NEXT_DATA__ or similar embedded JSON
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const listings = extractListingsFromNextData(data, location);
        if (listings.length > 0) return listings;
      } catch {
        // JSON parse failed, continue to fallback
      }
    }

    // Try structured data (JSON-LD)
    const jsonLdMatches = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    );
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const content = match
            .replace(/<script type="application\/ld\+json">/, "")
            .replace(/<\/script>/, "");
          const data = JSON.parse(content);
          if (data["@type"] === "ItemList" && data.itemListElement) {
            return data.itemListElement.map(
              (item: Record<string, unknown>, i: number) =>
                parseJsonLdListing(item, i, location)
            );
          }
        } catch {
          continue;
        }
      }
    }

    console.warn("Could not parse Opendoor data, using demo listings");
    return getDemoListings(location);
  } catch (error) {
    console.error("Error fetching Opendoor listings:", error);
    return getDemoListings(location);
  }
}

function extractListingsFromNextData(
  data: Record<string, unknown>,
  location: string
): Listing[] {
  // Navigate the __NEXT_DATA__ structure to find listings
  // This is fragile and depends on Opendoor's page structure
  try {
    const props = data.props as Record<string, unknown>;
    const pageProps = props?.pageProps as Record<string, unknown>;
    const homes =
      (pageProps?.homes as Record<string, unknown>[]) ||
      (pageProps?.listings as Record<string, unknown>[]) ||
      (pageProps?.properties as Record<string, unknown>[]);

    if (!homes) return [];

    return homes.slice(0, 20).map((home, i) => ({
      id: String(home.id || home.slug || `listing-${i}`),
      address: String(home.address || home.streetAddress || ""),
      city: String(home.city || location.split(",")[0]?.trim() || ""),
      state: String(home.state || location.split(",")[1]?.trim() || ""),
      zip: String(home.zip || home.zipCode || ""),
      price: Number(home.price || home.listPrice || 0),
      beds: Number(home.beds || home.bedrooms || 0),
      baths: Number(home.baths || home.bathrooms || 0),
      sqft: Number(home.sqft || home.squareFeet || home.livingArea || 0),
      yearBuilt: Number(home.yearBuilt || 0),
      url: String(
        home.url || home.permalink || `https://www.opendoor.com/homes/${home.slug}`
      ),
      imageUrl: String(home.imageUrl || home.photo || home.primaryPhoto || ""),
      status: String(home.status || "For Sale"),
      propertyType: String(home.propertyType || home.homeType || "Single Family"),
      description: String(home.description || ""),
    }));
  } catch {
    return [];
  }
}

function parseJsonLdListing(
  item: Record<string, unknown>,
  index: number,
  location: string
): Listing {
  const thing = (item.item || item) as Record<string, unknown>;
  return {
    id: `listing-${index}`,
    address: String(thing.name || thing.address || ""),
    city: location.split(",")[0]?.trim() || "",
    state: location.split(",")[1]?.trim() || "",
    zip: "",
    price: Number(thing.price || 0),
    beds: 0,
    baths: 0,
    sqft: 0,
    yearBuilt: 0,
    url: String(thing.url || ""),
    imageUrl: String(thing.image || ""),
    status: "For Sale",
    propertyType: "Single Family",
  };
}

function getDemoListings(location: string): Listing[] {
  const city = location.split(",")[0]?.trim() || "Phoenix";
  const state = location.split(",")[1]?.trim() || "AZ";

  return [
    {
      id: "demo-1",
      address: "4521 E Cactus Rd",
      city,
      state,
      zip: "85032",
      price: 385000,
      beds: 3,
      baths: 2,
      sqft: 1650,
      yearBuilt: 2005,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Single Family",
      description:
        "Beautiful single-story home with updated kitchen, granite countertops, stainless steel appliances, and a spacious backyard with a covered patio.",
    },
    {
      id: "demo-2",
      address: "7832 W Elm St",
      city,
      state,
      zip: "85033",
      price: 425000,
      beds: 4,
      baths: 2.5,
      sqft: 2100,
      yearBuilt: 2012,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Single Family",
      description:
        "Spacious two-story home in a gated community with a community pool. Features open floor plan, large master suite, and three-car garage.",
    },
    {
      id: "demo-3",
      address: "1290 N Scottsdale Rd",
      city,
      state,
      zip: "85257",
      price: 550000,
      beds: 4,
      baths: 3,
      sqft: 2450,
      yearBuilt: 2018,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Single Family",
      description:
        "Modern home with smart home features, quartz countertops, and a resort-style backyard with a pool and built-in BBQ.",
    },
    {
      id: "demo-4",
      address: "3456 S Mill Ave",
      city,
      state,
      zip: "85282",
      price: 310000,
      beds: 2,
      baths: 2,
      sqft: 1200,
      yearBuilt: 2000,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Townhouse",
      description:
        "Charming townhouse near downtown with updated flooring, fresh paint, and a private courtyard. Walking distance to shops and restaurants.",
    },
    {
      id: "demo-5",
      address: "9102 E Indian School Rd",
      city,
      state,
      zip: "85251",
      price: 475000,
      beds: 3,
      baths: 2.5,
      sqft: 1900,
      yearBuilt: 2015,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Single Family",
      description:
        "Energy-efficient home with solar panels, tankless water heater, and dual-pane windows. Features an open kitchen with island and walk-in pantry.",
    },
    {
      id: "demo-6",
      address: "6743 W Camelback Rd",
      city,
      state,
      zip: "85033",
      price: 365000,
      beds: 3,
      baths: 2,
      sqft: 1550,
      yearBuilt: 2008,
      url: "https://www.opendoor.com/homes",
      status: "For Sale",
      propertyType: "Single Family",
      description:
        "Well-maintained home with tile flooring throughout, vaulted ceilings, ceiling fans in every room, and a low-maintenance desert landscape.",
    },
  ];
}

export function formatListingForAgent(listing: Listing): string {
  return [
    `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
    `Price: $${listing.price.toLocaleString()}`,
    `${listing.beds} bed / ${listing.baths} bath / ${listing.sqft.toLocaleString()} sqft`,
    listing.yearBuilt ? `Built: ${listing.yearBuilt}` : "",
    `Type: ${listing.propertyType}`,
    `Status: ${listing.status}`,
    listing.description ? `Description: ${listing.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatAllListingsForAgent(listings: Listing[]): string {
  if (listings.length === 0) return "No listings found in this area.";
  return listings
    .map(
      (l, i) => `--- Listing ${i + 1} ---\n${formatListingForAgent(l)}`
    )
    .join("\n\n");
}
