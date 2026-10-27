export type Role = "CLIENT" | "ORGANIZER" | "CHECKER" | "ADMIN";
export interface User {
  username: string;
  roles: Role[];
}
export interface Seat {
  id: number;
  seat_id: number;
  row_label: string;
  number: number;
  x: number;
  y: number;
  accessible: boolean;
  sector: string;
  price: number;
  status: "AVAILABLE" | "HELD" | "SOLD" | "PASS";
}
export interface EventSummary {
  id: number;
  title: string;
  description: string;
  image_path: string;
  starts_at: string;
  ends_at: string;
  hall: string;
  venue?: string;
  min_price?: number;
  available_seats: number;
  status: "PUBLISHED" | "CANCELLED";
}
export interface EventDetail extends Omit<EventSummary, "available_seats"> {
  seats: Seat[];
  public_opens_at: string;
  priority_opens_at?: string;
}
export interface Hold {
  token: string;
  event_id: number;
  title: string;
  expires_at: string;
  total: number;
  seat_ids: number[];
}
export interface HoldResponse {
  token: string;
  expiresAt: string;
  total: number;
}
export interface Order {
  id: number;
  event_id: number;
  status: "PAID" | "DECLINED";
  total: number;
  created_at: string;
}
export interface Ticket {
  id: number;
  event_id: number;
  title: string;
  code: string;
  status: "ACTIVE" | "USED" | "CANCELLED";
  row_label: string;
  number: number;
}
export interface Season {
  id: number;
  name: string;
  starts_on: string;
  ends_on: string;
}
export interface SeasonPass {
  id: number;
  season_id: number;
  name: string;
  type: "FIXED" | "PRIORITY";
  seat_id?: number;
  events: number;
}
export interface SeasonSeat {
  id: number;
  row_label: string;
  number: number;
  hall: string;
}
export interface Hall {
  id: number;
  name: string;
  venue: string;
  seats: number;
}
export interface ReportRow {
  id: number;
  title: string;
  sector: string;
  capacity: number;
  sold: number;
  protected: number;
}
export interface NewEvent {
  hallId: number;
  seasonId: number | null;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  setupMinutes: number;
  teardownMinutes: number;
  priorityOpensAt: string | null;
  publicOpensAt: string;
}
export type CheckResult =
  "VALID" | "ALREADY_USED" | "WRONG_EVENT" | "CANCELLED" | "INVALID";
