export function getOrCreateSeed(): string {
  // Check for seed in the current query parameters
  const params = new URLSearchParams(window.location.search);
  let seed = params.get('seed');

  // If no seed present, generate one and update the URL without reloading
  if (!seed) {
    seed = Math.random().toString(36).slice(2, 8); // 6-character alphanumeric
    params.set('seed', seed);

    // Preserve current pathname (e.g. "/jouster/") while appending the new seed param
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  return seed;
}
