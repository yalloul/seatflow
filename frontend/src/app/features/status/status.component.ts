import { Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
@Component({
  selector: "sf-status",
  imports: [RouterLink],
  template: `<section class="panel narrow">
    <p class="eyebrow">SEATFLOW</p>
    <h1>{{ forbidden ? "Accès refusé" : "Page introuvable" }}</h1>
    <p>
      {{
        forbidden
          ? "Votre compte ne dispose pas du rôle nécessaire pour cet écran."
          : "Cette adresse ne correspond à aucune page."
      }}
    </p>
    <a class="primary" routerLink="/events">Retour aux événements</a>
  </section>`,
})
export class StatusComponent {
  readonly forbidden =
    inject(ActivatedRoute).snapshot.data["forbidden"] === true;
}
