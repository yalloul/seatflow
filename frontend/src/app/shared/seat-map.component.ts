import { Component, input, output } from "@angular/core";
import { Seat } from "../core/models";

@Component({
  selector: "sf-seat-map",
  template: `
    <div class="stage">SCÈNE</div>
    <p class="mapHint">
      Choisissez jusqu’à 8 places. Au clavier : Tab puis Entrée ou Espace.
      Faites défiler le plan sur mobile.
    </p>
    <div class="svgWrap">
      <svg viewBox="0 0 650 350" role="group" aria-label="Plan des places">
        @for (seat of seats(); track seat.id) {
          <g>
            <circle
              [attr.cx]="seat.x"
              [attr.cy]="seat.y"
              r="18"
              [attr.class]="
                'seat ' +
                seat.status.toLowerCase() +
                (selected().includes(seat.id) ? ' selected' : '') +
                (seat.accessible ? ' accessible' : '')
              "
              [attr.tabindex]="
                seat.status === 'AVAILABLE' && !disabled() ? 0 : -1
              "
              role="button"
              [attr.aria-disabled]="seat.status !== 'AVAILABLE' || disabled()"
              [attr.aria-pressed]="selected().includes(seat.id)"
              [attr.aria-label]="
                'Rangée ' +
                seat.row_label +
                ', place ' +
                seat.number +
                ', ' +
                seat.sector +
                ', ' +
                seat.price +
                ' MAD, ' +
                stateLabel(seat)
              "
              (click)="choose(seat)"
              (keydown.enter)="choose(seat)"
              (keydown.space)="$event.preventDefault(); choose(seat)"
            />
            <text
              [attr.x]="seat.x"
              [attr.y]="seat.y + 4"
              text-anchor="middle"
              class="seatLabel"
            >
              {{ seat.number }}
            </text>
          </g>
        }
      </svg>
    </div>
    <div class="legend">
      <span><i></i>Disponible</span><span><i class="held"></i>Bloquée</span
      ><span><i class="sold"></i>Vendue</span
      ><span><i class="pass"></i>Abonné</span
      ><span><i class="accessible"></i>Accessible</span
      ><span><i class="selected"></i>Sélectionnée</span>
    </div>
  `,
})
export class SeatMapComponent {
  readonly seats = input.required<Seat[]>();
  readonly selected = input<number[]>([]);
  readonly disabled = input(false);
  readonly toggled = output<number>();
  choose(seat: Seat) {
    if (!this.disabled() && seat.status === "AVAILABLE")
      this.toggled.emit(seat.id);
  }
  stateLabel(seat: Seat) {
    return (
      {
        AVAILABLE: "disponible",
        HELD: "temporairement bloquée",
        SOLD: "vendue",
        PASS: "réservée à un abonné",
      }[seat.status] + (seat.accessible ? ", accessible" : "")
    );
  }
}
