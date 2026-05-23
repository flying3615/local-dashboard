import type { PropertyWithItem } from "./api";

export interface PropertyMetric {
  id: string;
  address: string;
  suburb: string;
  price: number | null;
  pricePerM2Land: number | null;
  pricePerM2Floor: number | null;
  estimateMid: number | null;
  estimateGap: number | null;
  capitalValue: number | null;
  cvGap: number | null;
  daysOnMarket: number | null;
  bedrooms: number | null;
  landArea: number | null;
  floorArea: number | null;
}

export interface HistogramBin {
  range: string;
  count: number;
  low: number;
}

export interface SuburbSummary {
  suburb: string;
  count: number;
  medianPrice: number | null;
  medianPricePerM2: number | null;
}

export interface PricePerM2Entry {
  address: string;
  value: number;
}

export function parsePrice(price: string | null): number | null {
  if (!price) return null;

  const trimmed = price.trim();

  // "$1.2M" or "$1.2m"
  const mMatch = trimmed.match(/\$?([\d,.]+)\s*[Mm]\b/);
  if (mMatch) {
    const num = parseFloat(mMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(num) ? Math.round(num * 1_000_000) : null;
  }

  // "$875k" or "$875K"
  const kMatch = trimmed.match(/\$?([\d,.]+)\s*[Kk]\b/);
  if (kMatch) {
    const num = parseFloat(kMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(num) ? Math.round(num * 1_000) : null;
  }

  // "$875,000" or "$875000"
  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function computeMetrics(
  properties: PropertyWithItem[],
  now: string = new Date().toISOString(),
): PropertyMetric[] {
  const nowMs = Date.parse(now);

  return properties.map(({ item, property }) => {
    const price = property ? parsePrice(property.price) : null;
    const landArea = property?.landArea ?? null;
    const floorArea = property?.floorArea ?? null;

    const pricePerM2Land =
      price != null && landArea != null && landArea > 0
        ? Math.round(price / landArea)
        : null;

    const pricePerM2Floor =
      price != null && floorArea != null && floorArea > 0
        ? Math.round(price / floorArea)
        : null;

    let estimateMid: number | null = null;
    let estimateGap: number | null = null;

    if (property?.estimatedValueLow != null && property.estimatedValueHigh != null) {
      estimateMid = Math.round((property.estimatedValueLow + property.estimatedValueHigh) / 2);
      if (price != null && estimateMid > 0) {
        estimateGap = Math.round(((price - estimateMid) / estimateMid) * 100);
      }
    }

    const cv = property?.capitalValue ?? null;
    let cvGap: number | null = null;
    if (price != null && cv != null && cv > 0) {
      cvGap = Math.round(((price - cv) / cv) * 100);
    }

    let daysOnMarket: number | null = null;
    if (property?.listedAt) {
      const listedMs = Date.parse(property.listedAt);
      if (Number.isFinite(listedMs) && Number.isFinite(nowMs)) {
        daysOnMarket = Math.floor((nowMs - listedMs) / 86_400_000);
      }
    }

    return {
      id: item.id,
      address: property?.address ?? item.address ?? item.title,
      suburb: property?.suburb ?? item.area ?? "Unknown",
      price,
      pricePerM2Land,
      pricePerM2Floor,
      estimateMid,
      estimateGap,
      capitalValue: cv,
      cvGap,
      daysOnMarket,
      bedrooms: property?.bedrooms ?? null,
      landArea,
      floorArea,
    };
  });
}

export function buildPriceHistogram(
  metrics: PropertyMetric[],
  bracketSize: number = 100_000,
): HistogramBin[] {
  const prices = metrics
    .map((m) => m.price)
    .filter((p): p is number => p != null);

  if (prices.length === 0) return [];

  const min = Math.floor(Math.min(...prices) / bracketSize) * bracketSize;
  const max = Math.ceil(Math.max(...prices) / bracketSize) * bracketSize;

  const bins: HistogramBin[] = [];
  for (let low = min; low < max; low += bracketSize) {
    const high = low + bracketSize;
    const count = prices.filter((p) => p >= low && p < high).length;
    bins.push({
      range: `${formatShortPrice(low)}-${formatShortPrice(high)}`,
      count,
      low,
    });
  }

  return bins;
}

export function buildSuburbSummary(metrics: PropertyMetric[]): SuburbSummary[] {
  const groups = new Map<string, { display: string; items: PropertyMetric[] }>();

  for (const m of metrics) {
    const key = m.suburb.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(m);
    } else {
      groups.set(key, { display: m.suburb, items: [m] });
    }
  }

  return [...groups.entries()]
    .map(([, { display, items }]) => ({
      suburb: display,
      count: items.length,
      medianPrice: median(
        items.map((i) => i.price).filter((p): p is number => p != null),
      ),
      medianPricePerM2: median(
        items
          .map((i) => i.pricePerM2Land)
          .filter((p): p is number => p != null),
      ),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildPricePerM2Data(
  metrics: PropertyMetric[],
  field: "pricePerM2Land" | "pricePerM2Floor" = "pricePerM2Land",
): PricePerM2Entry[] {
  return metrics
    .filter((m) => m[field] != null)
    .sort((a, b) => (a[field] ?? 0) - (b[field] ?? 0))
    .map((m) => ({
      address: truncate(m.address, 35),
      value: m[field]!,
    }));
}

function formatShortPrice(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${Math.round(value / 1_000)}k`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
