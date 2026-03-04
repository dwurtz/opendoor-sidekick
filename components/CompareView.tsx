"use client";

import { Listing } from "@/lib/opendoor";

export function CompareView({
  listings,
  onClose,
}: {
  listings: [Listing, Listing];
  onClose: () => void;
}) {
  const [a, b] = listings;

  return (
    <div className="bg-white rounded-2xl border border-od-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-od-gray-100">
        <h3 className="text-[16px] font-semibold text-od-dark">
          Compare homes
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-od-gray-500 hover:bg-od-gray-50 hover:text-od-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Side-by-side grid */}
      <div className="grid grid-cols-2 divide-x divide-od-gray-100">
        <CompareColumn listing={a} />
        <CompareColumn listing={b} />
      </div>

      {/* Comparison rows */}
      <div className="border-t border-od-gray-100">
        <CompareRow label="Price" a={`$${a.price.toLocaleString()}`} b={`$${b.price.toLocaleString()}`} highlight />
        <CompareRow label="Beds" a={String(a.beds)} b={String(b.beds)} />
        <CompareRow label="Baths" a={String(a.baths)} b={String(b.baths)} />
        <CompareRow label="Sq ft" a={a.sqft.toLocaleString()} b={b.sqft.toLocaleString()} />
        {(a.pricePerSqft || b.pricePerSqft) && (
          <CompareRow label="Price/sqft" a={a.pricePerSqft || "—"} b={b.pricePerSqft || "—"} />
        )}
        {(a.yearBuilt > 0 || b.yearBuilt > 0) && (
          <CompareRow label="Year built" a={a.yearBuilt > 0 ? String(a.yearBuilt) : "—"} b={b.yearBuilt > 0 ? String(b.yearBuilt) : "—"} />
        )}
        {(a.propertyType || b.propertyType) && (
          <CompareRow label="Type" a={a.propertyType || "—"} b={b.propertyType || "—"} />
        )}
        {(a.lotSize || b.lotSize) && (
          <CompareRow label="Lot size" a={a.lotSize || "—"} b={b.lotSize || "—"} />
        )}
        {(a.garage || b.garage) && (
          <CompareRow label="Garage" a={a.garage || "—"} b={b.garage || "—"} />
        )}
        {(a.hoaFees || b.hoaFees) && (
          <CompareRow label="HOA" a={a.hoaFees || "—"} b={b.hoaFees || "—"} />
        )}
        {(a.estimatedPayment || b.estimatedPayment) && (
          <CompareRow label="Est. payment" a={a.estimatedPayment || "—"} b={b.estimatedPayment || "—"} />
        )}
        {(a.neighborhood || b.neighborhood) && (
          <CompareRow label="Neighborhood" a={a.neighborhood || "—"} b={b.neighborhood || "—"} />
        )}
        {(a.schoolDistrict || b.schoolDistrict) && (
          <CompareRow label="Schools" a={a.schoolDistrict || "—"} b={b.schoolDistrict || "—"} />
        )}
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 divide-x divide-od-gray-100 border-t border-od-gray-100">
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-center text-[14px] font-medium text-od-blue hover:bg-od-gray-50 transition-colors"
        >
          View on Opendoor
        </a>
        <a
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-center text-[14px] font-medium text-od-blue hover:bg-od-gray-50 transition-colors"
        >
          View on Opendoor
        </a>
      </div>
    </div>
  );
}

function CompareColumn({ listing }: { listing: Listing }) {
  return (
    <div>
      <div className="aspect-[16/10] bg-od-gray-50 relative overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-od-gray-50 to-od-gray-100">
            <svg className="w-10 h-10 text-od-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-od-dark shadow-sm">
            {listing.status}
          </span>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] text-od-gray-500 truncate">
          {listing.address}
        </p>
        <p className="text-[12px] text-od-gray-400 truncate">
          {listing.city}, {listing.state} {listing.zip}
        </p>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  highlight,
}: {
  label: string;
  a: string;
  b: string;
  highlight?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] border-b border-od-gray-100 last:border-b-0">
      <div className="px-4 py-2.5 text-[12px] text-od-gray-500 bg-od-gray-50 flex items-center">
        {label}
      </div>
      <div className={`px-4 py-2.5 text-[13px] ${highlight ? "font-bold text-od-dark" : "font-medium text-od-gray-700"}`}>
        {a}
      </div>
      <div className={`px-4 py-2.5 text-[13px] border-l border-od-gray-100 ${highlight ? "font-bold text-od-dark" : "font-medium text-od-gray-700"}`}>
        {b}
      </div>
    </div>
  );
}
