export function resolveCompanyTimeZone(timeZone?: string | null) {
  if (!timeZone) return undefined;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return undefined;
  }
}

function dateFromParts(parts: Intl.DateTimeFormatPart[]) {
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get("year"));
  const month = Number(values.get("month"));
  const day = Number(values.get("day"));
  const hour = Number(values.get("hour"));
  const minute = Number(values.get("minute"));
  const second = Number(values.get("second"));

  if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
    return new Date();
  }

  return new Date(year, month - 1, day, hour, minute, second);
}

export function getCurrentCompanyDate(timeZone?: string | null) {
  const resolved = resolveCompanyTimeZone(timeZone);
  if (!resolved) return new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolved,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return dateFromParts(formatter.formatToParts(new Date()));
}

export function parseCompanyDateTime(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  const localMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (localMatch) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] = localMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCompanyDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  const parsed = value instanceof Date ? value : parseCompanyDateTime(value);
  return parsed ? parsed.toLocaleDateString("en-US", options) : "—";
}

export function formatCompanyTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true },
) {
  const parsed = value instanceof Date ? value : parseCompanyDateTime(value);
  return parsed ? parsed.toLocaleTimeString("en-US", options) : "—";
}
