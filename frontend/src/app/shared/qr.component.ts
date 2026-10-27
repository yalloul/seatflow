import { Component, effect, input, signal } from "@angular/core";
import QRCode from "qrcode";

@Component({
  selector: "sf-qr",
  template: `@if (source()) {
      <img [src]="source()" width="170" height="170" alt="QR code du billet" />
    } @else {
      <p>Code à présenter : {{ code() }}</p>
    }`,
})
export class QrComponent {
  readonly code = input.required<string>();
  readonly source = signal("");
  constructor() {
    effect((onCleanup) => {
      let current = true;
      this.source.set("");
      QRCode.toDataURL(this.code(), { width: 170, margin: 1 })
        .then((url) => {
          if (current) this.source.set(url);
        })
        .catch(() => {});
      onCleanup(() => {
        current = false;
      });
    });
  }
}
