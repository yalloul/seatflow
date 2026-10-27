import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { errorMessage } from "../../core/notifications.service";

@Component({
  selector: "sf-login",
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel narrow">
      <p class="eyebrow">ESPACE PERSONNEL</p>
      <h1>Se connecter</h1>
      <p>
        Utilisez un compte de démonstration locale. Mot de passe :
        <code>demo1234</code>.
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label
          >Identifiant<select formControlName="username">
            <option value="">Choisir un compte</option>
            @for (name of accounts; track name) {
              <option [value]="name">{{ name }}</option>
            }
          </select></label
        ><label
          >Mot de passe<input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            required
        /></label>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button
          class="primary full"
          type="submit"
          [disabled]="form.invalid || busy()"
        >
          {{ busy() ? "Connexion…" : "Entrer →" }}
        </button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly accounts = [
    "client",
    "abonne",
    "prioritaire",
    "organisateur",
    "controleur",
    "admin",
  ];
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ["", Validators.required],
    password: ["", Validators.required],
  });
  readonly busy = signal(false);
  readonly error = signal("");
  async submit() {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(username, password);
      this.form.controls.password.reset();
      const target = this.route.snapshot.queryParamMap.get("returnUrl");
      await this.router.navigateByUrl(
        target?.startsWith("/") &&
          !target.startsWith("//") &&
          !target.startsWith("/login")
          ? target
          : "/events",
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
