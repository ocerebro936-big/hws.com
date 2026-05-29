const BASE_URL = "https://api.coingecko.com/api/v3";
const API_KEY = process.env.COINGECKO_API_KEY || "";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 60_000;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers["x-cg-demo-api-key"] = API_KEY;
  return headers;
}

function isCacheFresh(key: string): boolean {
  const entry = cache[key];
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function setCache(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

export async function fetchCryptoPrice(coinId: string, vsCurrency: string = "usd"): Promise<{ price: number; change24h: number } | null> {
  const key = `price_${coinId}_${vsCurrency}`;
  if (isCacheFresh(key)) return cache[key].data;

  try {
    const url = `${BASE_URL}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const coin = data[coinId];
    if (!coin) return null;
    const result = { price: coin[vsCurrency] ?? 0, change24h: coin[`${vsCurrency}_24h_change`] ?? 0 };
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

export async function fetchMultiplePrices(coinIds: string[], vsCurrency: string = "usd"): Promise<Record<string, { price: number; change24h: number }>> {
  const key = `multi_${coinIds.sort().join(",")}_${vsCurrency}`;
  if (isCacheFresh(key)) return cache[key].data;

  try {
    const url = `${BASE_URL}/simple/price?ids=${coinIds.join(",")}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, { price: number; change24h: number }> = {};
    for (const id of coinIds) {
      const coin = data[id];
      if (coin) {
        result[id] = { price: coin[vsCurrency] ?? 0, change24h: coin[`${vsCurrency}_24h_change`] ?? 0 };
      }
    }
    setCache(key, result);
    return result;
  } catch {
    return {};
  }
}

export async function getMtzRate(): Promise<{ usdMtz: number; usdEth: number; ethInMtz: number } | null> {
  const [mtzData, ethData] = await Promise.all([
    fetchCryptoPrice("coingecko", "usd"),
    fetchCryptoPrice("ethereum", "usd"),
  ]);
  if (!mtzData || !ethData) return null;
  /* Simular CG -> MTZ: 1 CG token ≈ 1 MT */
  const usdMtz = 1;
  const usdEth = ethData.price;
  const ethInMtz = usdEth / usdMtz;
  return { usdMtz, usdEth, ethInMtz };
}

export async function getSupportedCoins(): Promise<string[]> {
  if (isCacheFresh("supported_coins")) return cache["supported_coins"].data;
  try {
    const url = `${BASE_URL}/coins/list`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    const data: any[] = await res.json();
    const ids = data.slice(0, 200).map((c: any) => c.id);
    setCache("supported_coins", ids);
    return ids;
  } catch {
    return [];
  }
}
