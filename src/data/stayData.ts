import type { Listing } from "@/types/stay";

export const DESTINATIONS = ["Lisbon", "Kyoto", "Asheville", "Cape Town", "Tulum"];

type Seed = [title: string, city: string, country: string, kind: Listing["kind"], host: string, guests: number, beds: number, pets: boolean, nightly: number, cleaning: number, minNights: number, rating: number, reviews: number, palette: [string, string]];

const seeds: Seed[] = [
  ["Sunlit flat above Alfama rooftops", "Lisbon", "Portugal", "Apartment", "Inês", 4, 2, false, 14500, 6000, 2, 4.92, 318, ["#f6d365", "#fda085"]],
  ["Tiled townhouse with courtyard", "Lisbon", "Portugal", "Entire home", "Rui", 6, 3, true, 23000, 9000, 3, 4.88, 142, ["#a1c4fd", "#c2e9fb"]],
  ["Riverside loft in LX Factory", "Lisbon", "Portugal", "Loft", "Marta", 2, 1, true, 11000, 4500, 1, 4.71, 96, ["#84fab0", "#8fd3f4"]],
  ["Belém garden studio", "Lisbon", "Portugal", "Apartment", "João", 2, 1, false, 8900, 3500, 2, 4.65, 211, ["#fccb90", "#d57eeb"]],
  ["Machiya house near Gion", "Kyoto", "Japan", "Entire home", "Haruki", 5, 2, false, 31000, 12000, 2, 4.97, 402, ["#e0c3fc", "#8ec5fc"]],
  ["Quiet tatami room, Arashiyama", "Kyoto", "Japan", "Apartment", "Aiko", 2, 1, false, 9800, 4000, 1, 4.89, 188, ["#a8edea", "#fed6e3"]],
  ["Modern townhouse by the Kamo river", "Kyoto", "Japan", "Entire home", "Kenji", 8, 4, false, 42000, 15000, 3, 4.83, 75, ["#f093fb", "#f5576c"]],
  ["Blue Ridge A-frame with hot tub", "Asheville", "United States", "Cabin", "Dana", 4, 2, true, 21000, 8500, 2, 4.95, 264, ["#43e97b", "#38f9d7"]],
  ["Downtown loft over the arts district", "Asheville", "United States", "Loft", "Marcus", 3, 1, false, 13500, 6000, 1, 4.74, 133, ["#fa709a", "#fee140"]],
  ["Forest cabin with creek access", "Asheville", "United States", "Cabin", "Leah", 6, 3, true, 18500, 9500, 3, 4.9, 57, ["#30cfd0", "#330867"]],
  ["Clifftop villa facing the Atlantic", "Cape Town", "South Africa", "Villa", "Thabo", 10, 5, false, 65000, 25000, 4, 4.96, 88, ["#4facfe", "#00f2fe"]],
  ["Bo-Kaap apartment with mountain view", "Cape Town", "South Africa", "Apartment", "Amira", 3, 1, false, 9500, 4000, 2, 4.8, 154, ["#ff9a9e", "#fecfef"]],
  ["Camps Bay beach cottage", "Cape Town", "South Africa", "Entire home", "Pieter", 4, 2, true, 24000, 10000, 3, 4.86, 112, ["#ffecd2", "#fcb69f"]],
  ["Jungle casita with plunge pool", "Tulum", "Mexico", "Cabin", "Sofía", 2, 1, true, 17500, 7000, 2, 4.91, 301, ["#96fbc4", "#f9f586"]],
  ["Beachfront villa with cenote access", "Tulum", "Mexico", "Villa", "Diego", 8, 4, false, 52000, 22000, 4, 4.94, 67, ["#2af598", "#009efd"]],
  ["Aldea Zamá rooftop apartment", "Tulum", "Mexico", "Apartment", "Lucía", 4, 2, false, 12500, 5500, 2, 4.77, 190, ["#cd9cf2", "#f6f3ff"]],
];

const AMENITIES = ["Wifi", "Kitchen", "Washer", "Air conditioning", "Workspace", "Free parking", "Pool", "Hot tub", "Self check-in"];

export const seedListings: (Listing & { baseNightlyCents: number })[] = seeds.map(
  ([title, city, country, kind, hostName, maxGuests, bedrooms, petsAllowed, nightly, cleaning, minNights, rating, reviewCount, palette], index) => ({
    id: `l-${index + 1}`,
    title,
    city,
    country,
    kind,
    hostName,
    maxGuests,
    bedrooms,
    petsAllowed,
    cleaningFeeCents: cleaning,
    minNights,
    rating,
    reviewCount,
    palette,
    amenities: AMENITIES.filter((_, i) => (index + i) % 3 !== 0),
    description: `${kind} in ${city} hosted by ${hostName}. Sleeps ${maxGuests} across ${bedrooms} bedroom${bedrooms > 1 ? "s" : ""}.${petsAllowed ? " Pets welcome." : ""}`,
    baseNightlyCents: nightly,
  }),
);

/** The calendar is generated for this range (inclusive start, exclusive end). */
export const CALENDAR_START = "2026-10-01";
export const CALENDAR_END = "2027-03-01";

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });
}
