import { Component, inject, signal } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthService } from "./core/auth.service";
import { Notifications } from "./core/notifications.service";

@Component({
  selector: "sf-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./app.component.html",
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(Notifications);
  readonly busy = signal(false);
  private readonly router = inject(Router);
  async logout() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate(["/events"]);
      this.notifications.success("Vous êtes déconnecté.");
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
