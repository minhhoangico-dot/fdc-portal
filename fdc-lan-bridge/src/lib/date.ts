const HO_CHI_MINH_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toHoChiMinhDate(date: Date = new Date()): string {
  const parts = HO_CHI_MINH_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function addDays(date: string, days: number): string {
  const next = parseIsoDate(date);
  next.setDate(next.getDate() + days);
  return toHoChiMinhDate(next);
}

export function listDatesBetween(startDate: string, endDate: string): string[] {
  if (startDate > endDate) {
    return [];
  }

  const dates: string[] = [];
  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    dates.push(current);
  }

  return dates;
}
