import { Injectable, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return "Le serveur est indisponible. Réessayez dans quelques instants.";
    if (error.status === 401)
      return (
        error.error?.error ||
        "Votre session a expiré. Connectez-vous pour continuer."
      );
    return error.error?.error || `La demande a échoué (${error.status}).`;
  }
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
@Injectable({ providedIn: "root" })
export class Notifications {
  readonly message = signal("");
  success(message: string) {
    this.message.set(message);
  }
  error(error: unknown) {
    this.message.set(errorMessage(error));
  }
}
