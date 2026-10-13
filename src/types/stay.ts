export interface Listing {
  id: string;
  title: string;
  city: string;
  country: string;
  kind: "Entire home" | "Apartment" | "Cabin" | "Loft" | "Villa";
  hostName: string;
  maxGuests: number;
  bedrooms: number;
  petsAllowed: boolean;
  /** Integer cents, charged once per stay. */
  cleaningFeeCents: number;
  minNights: number;
  /** Guests included in the nightly price; extra guests pay `extraGuestFeeCents` per night. */
  baseGuests: number;
  extraGuestFeeCents: number;
  /** 0 when pets are not allowed. */
  maxPets: number;
  /** One-time fee per stay when bringing pets. */
  petFeeCents: number;
  rating: number;
  reviewCount: number;
  /** Two colors for the placeholder photo gradient. */
  palette: [string, string];
  amenities: string[];
  description: string;
}

export interface CalendarDay {
  /** "YYYY-MM-DD" (the night starting on this date). */
  date: string;
  available: boolean;
  priceCents: number;
}

export interface StayQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface Quote {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  nightlyCents: number[];
  subtotalCents: number;
  cleaningFeeCents: number;
  totalCents: number;
}

/** `quote` is set when `ok`; otherwise `reason` explains why the stay cannot be booked. */
export interface QuoteResult {
  ok: boolean;
  quote: Quote | null;
  reason: string | null;
}

export interface SearchResult {
  listing: Listing;
  quote: Quote;
}

export interface Reservation {
  id: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  pets: number;
  /** What the guest paid, integer cents. */
  totalCents: number;
  status: "confirmed" | "canceled";
  /** Increments whenever the host or the system changes the reservation. */
  version: number;
  updatedAt: string;
}

/** A priced proposal for changing guests/pets on an existing reservation. */
export interface ChangeQuote {
  reservationId: string;
  /** Reservation version and listing pricing version the quote was computed from. */
  reservationVersion: number;
  pricingVersion: number;
  guests: number;
  pets: number;
  nightlyCents: number[];
  extraGuestCents: number;
  petFeeCents: number;
  cleaningFeeCents: number;
  newTotalCents: number;
  originalTotalCents: number;
  /** newTotal − originalTotal (may be negative). */
  differenceCents: number;
}

export type HostDecision = { type: "decision"; reservationId: string; decision: "approved" | "declined" };
