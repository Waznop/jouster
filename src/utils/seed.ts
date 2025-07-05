export function getOrCreateSeed(): string {
  // Split the current pathname into meaningful segments
  const segments = window.location.pathname.split('/').filter(Boolean);

  // Attempt to locate the seed following the "jouster" segment
  const jousterIndex = segments.indexOf('jouster');
  let seed: string | undefined;

  if (jousterIndex !== -1 && segments.length > jousterIndex + 1) {
    seed = segments[jousterIndex + 1];
  }

  // If no seed in the URL, generate one and update the address bar (without reloading)
  if (!seed) {
    seed = Math.random().toString(36).slice(2, 8); // 6-character alphanumeric
    const newPath = `/jouster/${seed}`;
    window.history.replaceState({}, '', newPath);
  }

  return seed;
}
