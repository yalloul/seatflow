import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import {
  CheckResult,
  EventDetail,
  EventSummary,
  Hall,
  Hold,
  HoldResponse,
  NewEvent,
  Order,
  ReportRow,
  Season,
  SeasonPass,
  SeasonSeat,
  Ticket,
} from "./models";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  events() {
    return firstValueFrom(this.http.get<EventSummary[]>("/api/events"));
  }
  event(id: number) {
    return firstValueFrom(this.http.get<EventDetail>(`/api/events/${id}`));
  }
  holds() {
    return firstValueFrom(this.http.get<Hold[]>("/api/holds"));
  }
  hold(eventId: number, seatIds: number[]) {
    return firstValueFrom(
      this.http.post<HoldResponse>("/api/holds", { eventId, seatIds }),
    );
  }
  release(token: string) {
    return firstValueFrom(this.http.delete<void>(`/api/holds/${token}`));
  }
  confirm(
    holdToken: string,
    paymentResult: "success" | "decline",
    key: string,
  ) {
    return firstValueFrom(
      this.http.post<Order>(
        "/api/orders",
        { holdToken, paymentResult },
        { headers: { "Idempotency-Key": key } },
      ),
    );
  }
  orders() {
    return firstValueFrom(this.http.get<Order[]>("/api/orders"));
  }
  tickets() {
    return firstValueFrom(this.http.get<Ticket[]>("/api/tickets"));
  }
  passes() {
    return firstValueFrom(this.http.get<SeasonPass[]>("/api/passes"));
  }
  seasons() {
    return firstValueFrom(this.http.get<Season[]>("/api/seasons"));
  }
  seasonSeats(id: number) {
    return firstValueFrom(
      this.http.get<SeasonSeat[]>(`/api/seasons/${id}/seats`),
    );
  }
  buyPass(seasonId: number, type: "FIXED" | "PRIORITY", seatId: number | null) {
    return firstValueFrom(
      this.http.post<{ id: number; type: string }>("/api/passes", {
        seasonId,
        type,
        seatId,
      }),
    );
  }
  halls() {
    return firstValueFrom(this.http.get<Hall[]>("/api/admin/venues"));
  }
  report() {
    return firstValueFrom(this.http.get<ReportRow[]>("/api/admin/report"));
  }
  createEvent(event: NewEvent) {
    return firstValueFrom(
      this.http.post<{ id: number }>("/api/admin/events", event),
    );
  }
  check(code: string, eventId: number) {
    return firstValueFrom(
      this.http.post<{ result: CheckResult }>("/api/checkin", {
        code,
        eventId,
      }),
    );
  }
}
