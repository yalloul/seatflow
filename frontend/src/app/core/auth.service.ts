import { computed, inject, Injectable, signal } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Role, User } from "./models";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  readonly available = signal(true);
  readonly isClient = computed(() => this.hasRole("CLIENT", "ADMIN"));
  hasRole(...roles: Role[]) {
    return this.user()?.roles.some((role) => roles.includes(role)) ?? false;
  }
  private csrf() {
    return firstValueFrom(this.http.get("/api/auth/csrf"));
  }
  async restore() {
    // Remove passwords left by the previous React demo. Angular never stores them.
    localStorage.removeItem("sf_user");
    localStorage.removeItem("sf_pass");
    try {
      await this.csrf();
      this.user.set(await firstValueFrom(this.http.get<User>("/api/auth/me")));
      this.available.set(true);
    } catch (error) {
      this.user.set(null);
      this.available.set(
        error instanceof HttpErrorResponse && error.status === 401,
      );
    }
  }
  async login(username: string, password: string) {
    await this.csrf();
    await firstValueFrom(
      this.http.post(
        "/api/auth/login",
        new HttpParams().set("username", username).set("password", password),
      ),
    );
    await this.csrf();
    this.user.set(await firstValueFrom(this.http.get<User>("/api/auth/me")));
    this.available.set(true);
  }
  async logout() {
    await firstValueFrom(this.http.post("/api/auth/logout", {}));
    this.user.set(null);
    await this.csrf();
  }
}
