import listingsData from "@/data/listings.json";

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
  features?: string;
  lotSize?: string;
  hoaFees?: string;
  garage?: string;
  neighborhood?: string;
  schoolDistrict?: string;
  pricePerSqft?: string;
  estimatedPayment?: string;
}

interface RawListing {
  id: string;
  listing_url: string;
  primary_image_url: string;
  address: {
    full: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  property_type: string;
  year_built: string;
  lot_size: string;
  price_per_sqft: string;
  hoa_fees: string;
  estimated_monthly_payment: string;
  garage_parking: string;
  neighborhood: string;
  school_district: string;
  features: string;
  description: string;
  listing_state: string;
}

const allListings: Listing[] = (
  listingsData as { listings: RawListing[] }
).listings.map((raw) => ({
  id: raw.id,
  address: raw.address.street,
  city: raw.address.city,
  state: raw.address.state,
  zip: raw.address.zip,
  price: raw.price,
  beds: raw.beds,
  baths: raw.baths,
  sqft: raw.sqft,
  yearBuilt: parseInt(raw.year_built) || 0,
  url: raw.listing_url,
  imageUrl: raw.primary_image_url,
  status: raw.listing_state === "ON_THE_MARKET" ? "For Sale" : raw.listing_state,
  propertyType: raw.property_type,
  description: raw.description,
  features: raw.features,
  lotSize: raw.lot_size,
  hoaFees: raw.hoa_fees,
  garage: raw.garage_parking,
  neighborhood: raw.neighborhood,
  schoolDistrict: raw.school_district,
  pricePerSqft: raw.price_per_sqft,
  estimatedPayment: raw.estimated_monthly_payment,
}));

export async function fetchListings(
  location: string,
  filters?: { minPrice?: number; maxPrice?: number; minBeds?: number }
): Promise<Listing[]> {
  let results = allListings;

  // Filter by city if the location doesn't broadly match "Phoenix" metro
  const searchTerm = location.toLowerCase().replace(/,.*$/, "").trim();
  if (searchTerm && searchTerm !== "phoenix" && searchTerm !== "phoenix metro") {
    const cityMatch = results.filter(
      (l) => l.city.toLowerCase() === searchTerm
    );
    if (cityMatch.length > 0) {
      results = cityMatch;
    }
    // If no exact city match, keep all (they're all Phoenix metro)
  }

  if (filters?.minPrice) results = results.filter((l) => l.price >= filters.minPrice!);
  if (filters?.maxPrice) results = results.filter((l) => l.price <= filters.maxPrice!);
  if (filters?.minBeds) results = results.filter((l) => l.beds >= filters.minBeds!);

  return results;
}

export function formatListingForAgent(listing: Listing): string {
  return [
    `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
    `Price: $${listing.price.toLocaleString()}`,
    `${listing.beds} bed / ${listing.baths} bath / ${listing.sqft.toLocaleString()} sqft`,
    listing.yearBuilt ? `Built: ${listing.yearBuilt}` : "",
    `Type: ${listing.propertyType}`,
    listing.lotSize ? `Lot: ${listing.lotSize}` : "",
    listing.garage ? `Garage: ${listing.garage}` : "",
    listing.hoaFees ? `HOA: ${listing.hoaFees}` : "",
    listing.estimatedPayment ? `Est. Payment: ${listing.estimatedPayment}` : "",
    listing.neighborhood ? `Neighborhood: ${listing.neighborhood}` : "",
    listing.schoolDistrict ? `Schools: ${listing.schoolDistrict}` : "",
    listing.features ? `Features: ${listing.features}` : "",
    listing.description ? `Description: ${listing.description}` : "",
    listing.url ? `Link: ${listing.url}` : "",
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
