import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { EventSummary } from "../../core/models";
import { errorMessage } from "../../core/notifications.service";
import { EventDatePipe, MadPipe } from "../../shared/format.pipe";

@Component({
  selector: "sf-events",
  imports: [FormsModule, RouterLink, EventDatePipe, MadPipe],
  templateUrl: "./events.component.html",
})
export class EventsComponent {
  private readonly api = inject(ApiService);
  readonly events = signal<EventSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly search = signal("");
  readonly hall = signal("");
  readonly day = signal("");
  readonly onlyAvailable = signal(false);
  readonly halls = computed(() => [
    ...new Set(this.events().map((event) => event.hall)),
  ]);
  readonly filtered = computed(() =>
    this.events().filter(
      (event) =>
        (event.title + " " + event.hall)
          .toLocaleLowerCase("fr")
          .includes(this.search().toLocaleLowerCase("fr")) &&
        (!this.hall() || event.hall === this.hall()) &&
        (!this.day() ||
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Casablanca",
          }).format(new Date(event.starts_at)) === this.day()) &&
        (!this.onlyAvailable() ||
          (event.status === "PUBLISHED" && event.available_seats > 0)),
    ),
  );
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.events.set(await this.api.events());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
