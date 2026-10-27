import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "mad" })
export class MadPipe implements PipeTransform {
  transform(value: number | undefined): string {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(value ?? 0);
  }
}
@Pipe({ name: "eventDate" })
export class EventDatePipe implements PipeTransform {
  transform(value: string): string {
    return new Intl.DateTimeFormat("fr-MA", {
      timeZone: "Africa/Casablanca",
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  }
}
