export function noticeAddressLines(address: string, maxLength = 34) {
  const sourceLines = address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const sourceLine of sourceLines.length ? sourceLines : [address.trim()]) {
    const parts = sourceLine.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
      lines.push(sourceLine);
      continue;
    }
    let current = "";
    parts.forEach((part, index) => {
      const candidate = current ? `${current}, ${part}` : part;
      if (current && candidate.length > maxLength) {
        lines.push(`${current},`);
        current = part;
      } else {
        current = candidate;
      }
      if (index === parts.length - 1 && current) lines.push(current);
    });
  }

  return lines.filter(Boolean);
}
