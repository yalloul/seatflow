import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { Hall, ReportRow, Season } from "../../core/models";
import { errorMessage, Notifications } from "../../core/notifications.service";

@Component({
  selector: "sf-admin",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./admin.component.html",
})
export class AdminComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(Notifications);
  readonly halls = signal<Hall[]>([]);
  readonly report = signal<ReportRow[]>([]);
  readonly seasons = signal<Season[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly created = signal<number | null>(null);
  readonly form = inject(FormBuilder).group({
    hallId: [null as number | null, Validators.required],
    seasonId: [null as number | null],
    title: ["", [Validators.required, Validators.maxLength(160)]],
    description: ["", Validators.maxLength(4000)],
    startsAt: ["", Validators.required],
    endsAt: ["", Validators.required],
    setupMinutes: [
      60,
      [Validators.required, Validators.min(0), Validators.max(1440)],
    ],
    teardownMinutes: [
      30,
      [Validators.required, Validators.min(0), Validators.max(1440)],
    ],
    priorityOpensAt: [""],
    publicOpensAt: ["", Validators.required],
  });
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      const [halls, report, seasons] = await Promise.all([
        this.api.halls(),
        this.api.report(),
        this.api.seasons(),
      ]);
      this.halls.set(halls);
      this.report.set(report);
      this.seasons.set(seasons);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  async create() {
    if (this.form.invalid || this.busy()) return;
    const value = this.form.getRawValue();
    if (
      !value.hallId ||
      !value.startsAt ||
      !value.endsAt ||
      !value.publicOpensAt ||
      !value.title?.trim()
    )
      return;
    if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      this.notifications.success("La fin doit suivre le début.");
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.api.createEvent({
        hallId: value.hallId,
        seasonId: value.seasonId,
        title: value.title.trim(),
        description: value.description ?? "",
        startsAt: new Date(value.startsAt).toISOString(),
        endsAt: new Date(value.endsAt).toISOString(),
        setupMinutes: value.setupMinutes ?? 60,
        teardownMinutes: value.teardownMinutes ?? 30,
        priorityOpensAt: value.priorityOpensAt
          ? new Date(value.priorityOpensAt).toISOString()
          : null,
        publicOpensAt: new Date(value.publicOpensAt).toISOString(),
      });
      this.created.set(result.id);
      this.notifications.success(
        "Événement créé. Le plan est figé et les droits des abonnés de cette salle sont appliqués.",
      );
      await this.load();
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
