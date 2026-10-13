export type ResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

export interface Attendee {
  email: string;
  name: string;
  response: ResponseStatus;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** UTC instants (ISO). For all-day events, midnight-to-midnight in `timeZone`. */
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  /** Zone the event was created in; wall times are defined relative to it. */
  timeZone: string;
  color: string;
  location: string;
  /** Email of the organizer. The calendar owner organizes events they create. */
  organizer: string;
  attendees: Attendee[];
  version: number;
  updatedAt: string;
}

export interface EventInput {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  timeZone: string;
  color?: string;
  location?: string;
  attendees?: Attendee[];
}

export type AgendaEvent = { type: "event"; eventId: string } | { type: "deleted"; eventId: string };
