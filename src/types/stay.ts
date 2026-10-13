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

export interface Traveler {
  id: string;
  name: string;
  color: string;
}

export type GroupRole = "editor" | "viewer";

export interface TravelGroup {
  id: string;
  name: string;
  members: { travelerId: string; role: GroupRole }[];
}

/**
 * Something another traveler does, delivered by the mock controls. The
 * starter only emits these; applying them to wishlists is part of the task.
 */
export type CollaboratorAction =
  | { type: "save"; travelerId: string; listingId: string }
  | { type: "unsave"; travelerId: string; listingId: string }
  | { type: "vote"; travelerId: string; listingId: string; value: 1 | -1 | 0 }
  | { type: "note"; travelerId: string; listingId: string; text: string };
