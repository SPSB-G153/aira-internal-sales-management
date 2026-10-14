const DEFAULT_PRIVATE_READER = "http://127.0.0.1:8765";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Return a loopback-only URL so uploaded documents never leave this computer. */
export function privateReaderUrl() {
  const configured = process.env.NEXT_PUBLIC_BOOKING_OCR_URL || DEFAULT_PRIVATE_READER;
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("The private document reader address is invalid.");
  }
  if (parsed.protocol !== "http:" || !LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error("For privacy, document reading is restricted to this computer.");
  }
  return parsed.toString().replace(/\/$/, "");
}
