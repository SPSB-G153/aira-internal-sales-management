/**
 * Fit a complete postal address into the four approved Booking Form rows.
 * Adjacent comma-separated parts are combined where they fit; any remaining
 * parts are folded into the final row so information is never discarded.
 */
export function bookingAddressLines(address: string, maxLines = 4, targetLength = 34) {
  const parts = address
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return [];

  const lines: string[] = [];
  for (const part of parts) {
    const last = lines.at(-1);
    if (last && lines.length <= maxLines && `${last}, ${part}`.length <= targetLength) {
      lines[lines.length - 1] = `${last}, ${part}`;
    } else if (lines.length < maxLines) {
      lines.push(part);
    } else {
      lines[maxLines - 1] = `${lines[maxLines - 1]}, ${part}`;
    }
  }
  return lines;
}

export function bookingDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  const [, year, month, day] = match;
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${Number(day)} ${names[Number(month) - 1]} ${year}`;
}
