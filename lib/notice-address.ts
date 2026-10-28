function standardizeAddressPart(part: string) {
  if (/^aira residence$/i.test(part)) return "AIRA Residence";
  const number = part.match(/^no\.?\s*(\d+[a-z]?)$/i);
  if (number) return `No. ${number[1].toUpperCase()}`;

  const hasStreetNumberPrefix = /^no\.?\s+/i.test(part);
  const normalizedPart = hasStreetNumberPrefix ? part.replace(/^no\.?\s+/i, "No. ") : part;
  const standardized = normalizedPart.replace(/[A-Za-z]+/g, (word) => {
    if (word.length <= 3) return word.toUpperCase();
    return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
  });
  return hasStreetNumberPrefix ? standardized.replace(/^NO\.\s/, "No. ") : standardized;
}

export function noticeAddressLines(address: string, maxLength = 34) {
  const sourceLines = address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const sourceLine of sourceLines.length ? sourceLines : [address.trim()]) {
    const rawParts = sourceLine.split(",").map((part) => standardizeAddressPart(part.trim())).filter(Boolean);
    const towerMatch = rawParts[0]?.match(/^([a-z])-\d/i);
    if (towerMatch && !rawParts.some((part) => /^tower\s+[a-z]$/i.test(part))) {
      rawParts.splice(1, 0, `Tower ${towerMatch[1].toUpperCase()}`);
    }
    const parts: string[] = [];
    for (let index = 0; index < rawParts.length; index += 1) {
      const part = rawParts[index];
      if (/^no\.?\s*\d/i.test(part) && rawParts[index + 1]) {
        parts.push(`${part}, ${rawParts[index + 1]}`);
        index += 1;
      } else {
        parts.push(part);
      }
    }
    if (parts.length <= 1) {
      lines.push(sourceLine);
      continue;
    }
    let current = "";
    parts.forEach((part, index) => {
      const candidate = current ? `${current}, ${part}` : part;
      const lineLimit = /^no\.?\s*\d/i.test(current) ? maxLength + 6 : maxLength;
      if (current && candidate.length > lineLimit) {
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
