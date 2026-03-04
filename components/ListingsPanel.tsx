"use client";

import { Listing, proxyImageUrl } from "@/lib/opendoor";

export function ListingsPanel({ listings }: { listings: Listing[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] font-semibold text-od-dark">
          {listings.length} {listings.length === 1 ? "home" : "homes"} found
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-od-gray-100 overflow-hidden bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow"
    >
      {/* Image placeholder */}
      <div className="aspect-[16/10] bg-od-gray-50 relative overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={proxyImageUrl(listing.imageUrl)}
            alt={listing.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-od-gray-50 to-od-gray-100">
            <svg className="w-12 h-12 text-od-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-od-dark shadow-sm">
            {listing.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-[22px] font-bold text-od-dark">
          ${listing.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-[14px] text-od-gray-700">
          <span className="font-medium">{listing.beds}</span>
          <span className="text-od-gray-300">bd</span>
          <span className="text-od-gray-300 mx-1">|</span>
          <span className="font-medium">{listing.baths}</span>
          <span className="text-od-gray-300">ba</span>
          <span className="text-od-gray-300 mx-1">|</span>
          <span className="font-medium">{listing.sqft.toLocaleString()}</span>
          <span className="text-od-gray-300">sqft</span>
        </div>
        <p className="text-[14px] text-od-gray-500 mt-1.5 truncate">
          {listing.address}, {listing.city}, {listing.state} {listing.zip}
        </p>
        {listing.description && (
          <p className="text-[13px] text-od-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        )}
      </div>
    </a>
  );
}
