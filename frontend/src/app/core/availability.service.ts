import { DestroyRef, Injectable, inject } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({ providedIn: "root" })
export class AvailabilityService {
  private readonly changes = new Subject<number | null>();
  readonly changed$ = this.changes.asObservable();
  private readonly stream = new EventSource("/api/stream/availability");
  constructor() {
    this.stream.addEventListener("availability", (event) =>
      this.changes.next(Number((event as MessageEvent).data)),
    );
    this.stream.onopen = () => this.changes.next(null);
    inject(DestroyRef).onDestroy(() => this.stream.close());
  }
}
