import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";

import type { PropertyWithItem } from "../lib/api";
import {
  buildPriceHistogram,
  buildPricePerM2Data,
  buildSuburbSummary,
  computeMetrics,
  median,
} from "../lib/analysis";

interface PropertyAnalyticsProps {
  properties: PropertyWithItem[];
}

const SECTIONS = [
  "distribution",
  "priceLand",
  "priceFloor",
  "scatter",
  "daysOnMarket",
  "estimateGap",
  "suburb",
] as const;

type SectionId = (typeof SECTIONS)[number];

export function PropertyAnalytics({ properties }: PropertyAnalyticsProps) {
  const [open, setOpen] = useState<Set<SectionId>>(new Set(["distribution"]));

  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const metrics = useMemo(() => computeMetrics(properties), [properties]);
  const histogram = useMemo(() => buildPriceHistogram(metrics), [metrics]);
  const pricePerM2 = useMemo(() => buildPricePerM2Data(metrics, "pricePerM2Land"), [metrics]);
  const pricePerM2Floor = useMemo(() => buildPricePerM2Data(metrics, "pricePerM2Floor"), [metrics]);
  const suburbSummary = useMemo(() => buildSuburbSummary(metrics), [metrics]);
  const scatterData = useMemo(
    () =>
      metrics
        .filter((m) => m.price != null && m.capitalValue != null)
        .map((m) => ({
          address: m.address,
          price: m.price!,
          cv: m.capitalValue!,
          gap: m.cvGap!,
        })),
    [metrics],
  );

  const daysOnMarketData = useMemo(
    () =>
      metrics
        .filter((m) => m.daysOnMarket != null && m.daysOnMarket >= 0)
        .sort((a, b) => (b.daysOnMarket ?? 0) - (a.daysOnMarket ?? 0))
        .map((m) => ({
          address: truncate(m.address, 35),
          days: m.daysOnMarket!,
        })),
    [metrics],
  );

  const estimateGapData = useMemo(
    () =>
      metrics
        .filter((m) => m.estimateGap != null)
        .sort((a, b) => (b.estimateGap ?? 0) - (a.estimateGap ?? 0))
        .map((m) => ({
          address: m.address,
          price: m.price!,
          estimateMid: m.estimateMid!,
          gap: m.estimateGap!,
        })),
    [metrics],
  );

  const prices = metrics
    .map((m) => m.price)
    .filter((p): p is number => p != null);
  const pricesPerM2Land = metrics
    .map((m) => m.pricePerM2Land)
    .filter((p): p is number => p != null);
  const pricesPerM2Floor = metrics
    .map((m) => m.pricePerM2Floor)
    .filter((p): p is number => p != null);

  const medianPrice = median(prices);
  const medianPerM2Land = median(pricesPerM2Land);
  const medianPerM2Floor = median(pricesPerM2Floor);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  if (properties.length === 0) {
    return (
      <div className="property-analytics" data-testid="property-analytics">
        <p className="empty-state">No property data available for analytics.</p>
      </div>
    );
  }

  return (
    <div className="property-analytics" data-testid="property-analytics">
      <div className="analytics-summary">
        <div className="analytics-stat">
          <span className="analytics-stat-value">{prices.length}</span>
          <span className="analytics-stat-label">Listings</span>
        </div>
        {medianPrice != null && (
          <div className="analytics-stat">
            <span className="analytics-stat-value">
              ${medianPrice.toLocaleString()}
            </span>
            <span className="analytics-stat-label">Median Price</span>
          </div>
        )}
        {medianPerM2Land != null && (
          <div className="analytics-stat">
            <span className="analytics-stat-value">
              ${medianPerM2Land.toLocaleString()}
            </span>
            <span className="analytics-stat-label">Median $/m² Land</span>
          </div>
        )}
        {medianPerM2Floor != null && (
          <div className="analytics-stat">
            <span className="analytics-stat-value">
              ${medianPerM2Floor.toLocaleString()}
            </span>
            <span className="analytics-stat-label">Median $/m² Floor</span>
          </div>
        )}
        {minPrice != null && maxPrice != null && (
          <div className="analytics-stat">
            <span className="analytics-stat-value">
              ${formatShort(minPrice)} – ${formatShort(maxPrice)}
            </span>
            <span className="analytics-stat-label">Price Range</span>
          </div>
        )}
      </div>

      <div className="analytics-charts">
        {histogram.length > 0 && (
          <Section
            id="distribution"
            title="Price Distribution"
            open={open.has("distribution")}
            onToggle={toggle}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {pricePerM2.length > 0 && (
          <Section
            id="priceLand"
            title="Price per m² (Land)"
            open={open.has("priceLand")}
            onToggle={toggle}
          >
            <ResponsiveContainer width="100%" height={Math.max(200, pricePerM2.length * 28)}>
              <BarChart
                data={pricePerM2}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} scale="log" domain={["auto", "auto"]} />
                <YAxis
                  type="category"
                  dataKey="address"
                  width={180}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "$/m²"]}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {pricePerM2Floor.length > 0 && (
          <Section
            id="priceFloor"
            title="Price per m² (Floor)"
            open={open.has("priceFloor")}
            onToggle={toggle}
          >
            <ResponsiveContainer width="100%" height={Math.max(200, pricePerM2Floor.length * 28)}>
              <BarChart
                data={pricePerM2Floor}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} scale="log" domain={["auto", "auto"]} />
                <YAxis
                  type="category"
                  dataKey="address"
                  width={180}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "$/m² floor"]}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {scatterData.length >= 2 && (
          <Section
            id="scatter"
            title="Price vs CV (Council Valuation)"
            hint="Above line = priced above CV"
            open={open.has("scatter")}
            onToggle={toggle}
          >
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  dataKey="cv"
                  name="CV"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  domain={["dataMin", "dataMax"]}
                />
                <YAxis
                  type="number"
                  dataKey="price"
                  name="Price"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  domain={["dataMin", "dataMax"]}
                />
                <ReferenceLine
                  stroke="#999"
                  strokeDasharray="5 5"
                  segment={[
                    { x: Math.min(...scatterData.map((d) => Math.min(d.price, d.cv))), y: Math.min(...scatterData.map((d) => Math.min(d.price, d.cv))) },
                    { x: Math.max(...scatterData.map((d) => Math.max(d.price, d.cv))), y: Math.max(...scatterData.map((d) => Math.max(d.price, d.cv))) },
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { address: string; price: number; cv: number };
                    return (
                      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.address}</div>
                        <div>Listing Price: ${d.price.toLocaleString()}</div>
                        <div>Council Valuation: ${d.cv.toLocaleString()}</div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scatterData}
                  fill="#2563eb"
                  r={6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Section>
        )}

        {daysOnMarketData.length > 0 && (
          <Section
            id="daysOnMarket"
            title="Days on Market"
            open={open.has("daysOnMarket")}
            onToggle={toggle}
          >
            <ResponsiveContainer width="100%" height={Math.max(200, daysOnMarketData.length * 28)}>
              <BarChart
                data={daysOnMarketData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="address"
                  width={180}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [`${value} days`, "Listed for"]}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar
                  dataKey="days"
                  radius={[0, 4, 4, 0]}
                  fill="#2563eb"
                />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {estimateGapData.length > 0 && (
          <Section
            id="estimateGap"
            title="Price vs HomesEstimate"
            hint="Positive = priced above estimate"
            open={open.has("estimateGap")}
            onToggle={toggle}
          >
            <table className="property-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Price</th>
                  <th>Estimate</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>
                {estimateGapData.map((d) => (
                  <tr key={d.address}>
                    <td className="property-address">{d.address}</td>
                    <td>${d.price.toLocaleString()}</td>
                    <td>${d.estimateMid.toLocaleString()}</td>
                    <td
                      className={
                        d.gap > 10
                          ? "gap-overpriced"
                          : d.gap < -5
                            ? "gap-bargain"
                            : ""
                      }
                    >
                      {d.gap > 0 ? "+" : ""}
                      {d.gap}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {suburbSummary.length > 0 && (
          <Section
            id="suburb"
            title="Suburb Breakdown"
            open={open.has("suburb")}
            onToggle={toggle}
          >
            <table className="property-table">
              <thead>
                <tr>
                  <th>Suburb</th>
                  <th>Listings</th>
                  <th>Median Price</th>
                  <th>Median $/m² Land</th>
                </tr>
              </thead>
              <tbody>
                {suburbSummary.map((s) => (
                  <tr key={s.suburb}>
                    <td>{s.suburb}</td>
                    <td>{s.count}</td>
                    <td>
                      {s.medianPrice != null
                        ? `$${s.medianPrice.toLocaleString()}`
                        : "—"}
                    </td>
                    <td>
                      {s.medianPricePerM2 != null
                        ? `$${s.medianPricePerM2.toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`analytics-section ${open ? "analytics-section--open" : ""}`}>
      <button
        className="analytics-section-header"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <svg
          className="analytics-chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <span className="analytics-section-title">{title}</span>
        {hint && <span className="analytics-hint">{hint}</span>}
      </button>
      {open && <div className="analytics-section-body">{children}</div>}
    </section>
  );
}

function formatShort(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(value / 1_000)}k`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
