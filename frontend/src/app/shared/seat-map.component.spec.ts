import { TestBed } from "@angular/core/testing";
import { describe, it, expect, vi } from "vitest";
import { SeatMapComponent } from "./seat-map.component";
import { Seat } from "../core/models";

const seat: Seat = {
  id: 8,
  seat_id: 8,
  row_label: "A",
  number: 8,
  x: 80,
  y: 80,
  accessible: false,
  sector: "VIP",
  price: 350,
  status: "AVAILABLE",
};
async function setup(value: Seat, disabled = false) {
  const fixture = TestBed.createComponent(SeatMapComponent);
  fixture.componentRef.setInput("seats", [value]);
  fixture.componentRef.setInput("disabled", disabled);
  await fixture.whenStable();
  const selected = vi.fn();
  fixture.componentInstance.toggled.subscribe(selected);
  return {
    circle: fixture.nativeElement.querySelector("circle") as SVGCircleElement,
    selected,
  };
}
describe("Plan des places", () => {
  it("permet de choisir une place disponible à la souris et au clavier", async () => {
    const { circle, selected } = await setup(seat);
    circle.dispatchEvent(new MouseEvent("click"));
    circle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(selected).toHaveBeenNthCalledWith(1, 8);
    expect(selected).toHaveBeenNthCalledWith(2, 8);
    expect(circle.getAttribute("aria-label")).toContain("350 MAD, disponible");
  });
  it("empêche de choisir une place déjà bloquée", async () => {
    const { circle, selected } = await setup({ ...seat, status: "HELD" });
    circle.dispatchEvent(new MouseEvent("click"));
    expect(selected).not.toHaveBeenCalled();
    expect(circle.getAttribute("aria-disabled")).toBe("true");
    expect(circle.getAttribute("tabindex")).toBe("-1");
  });
  it("empêche de modifier la sélection pendant une opération", async () => {
    const { circle, selected } = await setup(seat, true);
    circle.dispatchEvent(new MouseEvent("click"));
    expect(selected).not.toHaveBeenCalled();
  });
});
