import { HttpErrorResponse } from "@angular/common/http";
import { describe, expect, it } from "vitest";
import { errorMessage } from "./notifications.service";

describe("Messages d’erreur utilisateur", () => {
  it("distingue un mauvais mot de passe d’une session expirée", () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { error: "Identifiant ou mot de passe incorrect" },
    });
    expect(errorMessage(error)).toBe("Identifiant ou mot de passe incorrect");
  });
  it("explique une panne réseau sans afficher un message de connexion incorrect", () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain(
      "serveur est indisponible",
    );
  });
});
