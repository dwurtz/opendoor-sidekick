"use client";

import { Listing } from "@/lib/opendoor";

export function PropertyDetail({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-od-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Hero Image */}
      <div className="relative aspect-[16/9] bg-od-gray-50">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-od-gray-50 to-od-gray-100">
            <svg
              className="w-16 h-16 text-od-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-od-dark shadow-sm">
            {listing.status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-od-gray-700 hover:bg-white hover:text-od-dark shadow-sm transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Price & Address */}
        <p className="text-[28px] font-bold text-od-dark">
          ${listing.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-[15px] text-od-gray-700">
          <span className="font-medium">{listing.beds}</span>
          <span className="text-od-gray-300">bd</span>
          <span className="text-od-gray-300 mx-1">|</span>
          <span className="font-medium">{listing.baths}</span>
          <span className="text-od-gray-300">ba</span>
          <span className="text-od-gray-300 mx-1">|</span>
          <span className="font-medium">{listing.sqft.toLocaleString()}</span>
          <span className="text-od-gray-300">sqft</span>
          {listing.yearBuilt > 0 && (
            <>
              <span className="text-od-gray-300 mx-1">|</span>
              <span className="text-od-gray-300">Built</span>
              <span className="font-medium">{listing.yearBuilt}</span>
            </>
          )}
        </div>
        <p className="text-[14px] text-od-gray-500 mt-1">
          {listing.address}, {listing.city}, {listing.state} {listing.zip}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-5 pt-5 border-t border-od-gray-100">
          {listing.propertyType && (
            <DetailItem label="Type" value={listing.propertyType} />
          )}
          {listing.pricePerSqft && (
            <DetailItem label="Price/sqft" value={listing.pricePerSqft} />
          )}
          {listing.lotSize && (
            <DetailItem label="Lot size" value={listing.lotSize} />
          )}
          {listing.garage && (
            <DetailItem label="Garage" value={listing.garage} />
          )}
          {listing.hoaFees && (
            <DetailItem label="HOA" value={listing.hoaFees} />
          )}
          {listing.estimatedPayment && (
            <DetailItem label="Est. payment" value={listing.estimatedPayment} />
          )}
          {listing.neighborhood && (
            <DetailItem label="Neighborhood" value={listing.neighborhood} />
          )}
          {listing.schoolDistrict && (
            <DetailItem label="Schools" value={listing.schoolDistrict} />
          )}
        </div>

        {/* Features */}
        {listing.features && (
          <div className="mt-5 pt-5 border-t border-od-gray-100">
            <p className="text-[13px] font-medium text-od-gray-700 mb-1.5">
              Features
            </p>
            <p className="text-[13px] text-od-gray-500 leading-relaxed">
              {listing.features}
            </p>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <div className="mt-4 pt-4 border-t border-od-gray-100">
            <p className="text-[13px] font-medium text-od-gray-700 mb-1.5">
              About this home
            </p>
            <p className="text-[13px] text-od-gray-500 leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        {/* CTA */}
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-6 w-full px-6 py-3 bg-od-blue hover:bg-od-blue-hover text-white text-[15px] font-medium rounded-xl text-center transition-colors"
        >
          View on Opendoor
        </a>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-od-gray-500">{label}</p>
      <p className="text-[14px] font-medium text-od-dark">{value}</p>
    </div>
  );
}
