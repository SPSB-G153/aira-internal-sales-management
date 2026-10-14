export function mergeDocumentContent(
  stored: Record<string, unknown>,
  current: Record<string, unknown>,
) {
  const presentCurrent = Object.fromEntries(
    Object.entries(current).filter(([, value]) =>
      value !== null
      && value !== undefined
      && (typeof value !== "string" || value.trim() !== ""),
    ),
  );
  return { ...stored, ...presentCurrent };
}
