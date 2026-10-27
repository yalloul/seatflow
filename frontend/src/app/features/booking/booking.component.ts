import { Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ApiService } from "../../core/api.service";
import { AuthService } from "../../core/auth.service";
import { AvailabilityService } from "../../core/availability.service";
import { EventDetail, Hold } from "../../core/models";
import { errorMessage, Notifications } from "../../core/notifications.service";
import { SeatMapComponent } from "../../shared/seat-map.component";
import { EventDatePipe, MadPipe } from "../../shared/format.pipe";

@Component({
  selector: "sf-booking",
  imports: [RouterLink, SeatMapComponent, EventDatePipe, MadPipe],
  templateUrl: "./booking.component.html",
})
export class BookingComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly notifications = inject(Notifications);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly event = signal<EventDetail | null>(null);
  readonly hold = signal<Hold | null>(null);
  readonly selected = signal<number[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly now = signal(Date.now());
  readonly pendingResult = signal<"success" | "decline" | null>(null);
  readonly remaining = computed(
    () =>
      Math.max(
        0,
        Math.ceil(
          (Date.parse(this.hold()?.expires_at ?? "") - this.now()) / 1000,
        ),
      ) || 0,
  );
  readonly countdown = computed(
    () =>
      Math.floor(this.remaining() / 60) +
      ":" +
      String(this.remaining() % 60).padStart(2, "0"),
  );
  readonly chosen = computed(
    () =>
      this.event()?.seats.filter((seat) =>
        (this.hold()?.seat_ids ?? this.selected()).includes(seat.id),
      ) ?? [],
  );
  readonly total = computed(
    () =>
      this.hold()?.total ??
      this.chosen().reduce((total, seat) => total + Number(seat.price), 0),
  );
  private version = 0;
  private refreshing = false;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hold.set(null);
      this.selected.set([]);
      void this.load();
    });
    inject(AvailabilityService)
      .changed$.pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (id === null || id === this.event()?.id) void this.refresh();
      });
    const tick = setInterval(() => {
      this.now.set(Date.now());
      if (this.hold() && this.remaining() === 0 && !this.busy()) {
        this.hold.set(null);
        this.selected.set([]);
        this.pendingResult.set(null);
        this.notifications.success(
          "Le blocage a expiré. Choisissez à nouveau vos places.",
        );
        void this.refresh();
      }
    }, 1000);
    const poll = setInterval(() => {
      void this.refresh();
    }, 10000);
    this.destroyRef.onDestroy(() => {
      this.version++;
      clearInterval(tick);
      clearInterval(poll);
    });
  }
  async load() {
    const version = ++this.version;
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.loading.set(true);
    this.error.set("");
    this.event.set(null);
    try {
      const [event, holds] = await Promise.all([
        this.api.event(id),
        this.auth.isClient() ? this.api.holds() : Promise.resolve([]),
      ]);
      if (version !== this.version) return;
      this.event.set(event);
      const token = this.route.snapshot.queryParamMap.get("hold");
      this.hold.set(
        holds.find(
          (hold) => hold.event_id === id && (!token || token === hold.token),
        ) ?? null,
      );
      this.restorePayment();
    } catch (error) {
      if (version === this.version) this.error.set(errorMessage(error));
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  async refresh() {
    const event = this.event();
    if (!event || this.refreshing || this.busy()) return;
    this.refreshing = true;
    try {
      const updated = await this.api.event(event.id);
      if (this.event()?.id !== event.id || this.destroyRef.destroyed) return;
      this.event.set(updated);
      this.error.set("");
      this.selected.update((ids) =>
        ids.filter((id) =>
          updated.seats.some(
            (seat) => seat.id === id && seat.status === "AVAILABLE",
          ),
        ),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.refreshing = false;
    }
  }
  toggle(id: number) {
    if (this.hold()) return;
    if (this.selected().includes(id))
      this.selected.update((ids) => ids.filter((value) => value !== id));
    else if (this.selected().length < 8)
      this.selected.update((ids) => [...ids, id]);
    else
      this.notifications.success(
        "Vous pouvez sélectionner au maximum 8 places.",
      );
  }
  async reserve() {
    const event = this.event();
    if (!event || this.busy() || !this.selected().length || this.hold()) return;
    if (!this.auth.user()) {
      await this.router.navigate(["/login"], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.busy.set(true);
    try {
      const response = await this.api.hold(event.id, this.selected());
      this.hold.set({
        token: response.token,
        event_id: event.id,
        title: event.title,
        expires_at: response.expiresAt,
        total: response.total,
        seat_ids: [...this.selected()],
      });
      this.selected.set([]);
      this.now.set(Date.now());
      this.pendingResult.set(null);
      this.notifications.success(
        "Vos places sont bloquées pendant 10 minutes.",
      );
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
      await this.refresh();
    }
  }
  async release() {
    const hold = this.hold();
    if (!hold || this.busy() || this.pendingResult()) return;
    this.busy.set(true);
    try {
      await this.api.release(hold.token);
      sessionStorage.removeItem("sf_payment_" + hold.token);
      this.hold.set(null);
      this.selected.set([]);
      this.notifications.success("Vos places ont été libérées.");
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
      await this.refresh();
    }
  }
  private restorePayment() {
    this.pendingResult.set(null);
    const hold = this.hold();
    if (!hold) return;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("sf_payment_" + hold.token) ?? "null",
      );
      if (saved?.result === "success" || saved?.result === "decline")
        this.pendingResult.set(saved.result);
    } catch {
      sessionStorage.removeItem("sf_payment_" + hold.token);
    }
  }
  async confirm(result: "success" | "decline") {
    const hold = this.hold();
    if (!hold || this.busy() || !this.remaining()) return;
    const storageKey = "sf_payment_" + hold.token;
    this.busy.set(true);
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as { key: string; result: "success" | "decline" } | null;
      const payment = saved ?? { key: crypto.randomUUID(), result };
      sessionStorage.setItem(storageKey, JSON.stringify(payment));
      this.pendingResult.set(payment.result);
      const order = await this.api.confirm(
        hold.token,
        payment.result,
        payment.key,
      );
      sessionStorage.removeItem(storageKey);
      this.hold.set(null);
      this.selected.set([]);
      this.pendingResult.set(null);
      this.notifications.success(
        order.status === "PAID"
          ? "Paiement simulé accepté. Vos billets sont disponibles."
          : "Paiement simulé refusé. Vos places ont été libérées.",
      );
      if (order.status === "PAID") await this.router.navigate(["/tickets"]);
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
      await this.refresh();
    }
  }
}
