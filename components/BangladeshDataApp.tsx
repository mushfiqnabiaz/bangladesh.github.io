"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  ArrowDownToLine,
  BadgeCheck,
  Database,
  Map,
  MapPin,
  Search,
  Store,
  Table2,
  UsersRound,
  Waypoints
} from "lucide-react";
import type { DashboardData, DataRow, DatasetDefinition } from "@/lib/data";

type DatasetResponse = {
  dataset: DatasetDefinition;
  rows: DataRow[];
};

type GeoFeature = {
  type: "Feature";
  properties?: Record<string, string | number | null>;
  geometry?: {
    type: string;
    coordinates: unknown;
  };
};

type GeoResponse = {
  dataset: DatasetDefinition;
  geojson: {
    type: string;
    features?: GeoFeature[];
  };
};

type ThanaProfile = {
  division: string;
  district: string;
  thana: string;
  thanaType: string;
  population: string;
  areaSqKm: string;
  densityPerSqKm: string;
  primarySector: string;
  subActivity: string;
  marketClassification: string;
  fmcgTradeClass: string;
  consumerProfile: string;
  likelyTopFmcgCategories: string;
  distributionPriority: string;
  sourceKey: string;
};

type ThanaResponse = {
  sourceOfTruth: string;
  rows: ThanaProfile[];
};

const formatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const layerOptions = [
  { id: "bangladesh-boundaries", label: "Upazila boundaries" },
  { id: "bazars", label: "Bazars" },
  { id: "major-routes", label: "Major routes" }
];

const heroCities = [
  { name: "Dhaka", lon: 90.4125, lat: 23.8103, primary: true },
  { name: "Chattogram", lon: 91.7832, lat: 22.3569 },
  { name: "Khulna", lon: 89.5403, lat: 22.8456 },
  { name: "Rajshahi", lon: 88.6241, lat: 24.3636 },
  { name: "Sylhet", lon: 91.8687, lat: 24.8949 }
];

function formatNumber(value: number) {
  return formatter.format(Math.round(value));
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function formatProfileNumber(value: unknown, suffix = "") {
  const number = toNumber(value);
  return number ? `${formatNumber(number)}${suffix}` : "n/a";
}

function downloadRows(dataset: DatasetDefinition | null, rows: DataRow[]) {
  if (!dataset || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dataset.id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function staticDataUrl(path: string) {
  return `${basePath}/data/${path}`;
}

function flattenCoordinates(input: unknown, output: Array<[number, number]> = []) {
  if (!Array.isArray(input)) return output;
  if (typeof input[0] === "number" && typeof input[1] === "number") {
    output.push([Number(input[0]), Number(input[1])]);
    return output;
  }
  input.forEach((part) => flattenCoordinates(part, output));
  return output;
}

function buildProjection(features: GeoFeature[], width: number, height: number) {
  const coords = features.flatMap((feature) => flattenCoordinates(feature.geometry?.coordinates));
  const lons = coords.map(([lon]) => lon);
  const lats = coords.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const pad = 28;
  const scale = Math.min((width - pad * 2) / (maxLon - minLon || 1), (height - pad * 2) / (maxLat - minLat || 1));
  const xOffset = (width - (maxLon - minLon) * scale) / 2;
  const yOffset = (height - (maxLat - minLat) * scale) / 2;

  return ([lon, lat]: [number, number]) => [
    xOffset + (lon - minLon) * scale,
    height - (yOffset + (lat - minLat) * scale)
  ] as const;
}

function ringPath(ring: unknown, project: (point: [number, number]) => readonly [number, number]) {
  const points = flattenCoordinates(ring);
  return points.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function geometryPath(geometry: GeoFeature["geometry"], project: (point: [number, number]) => readonly [number, number]) {
  if (!geometry) return "";
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((ring) => `${ringPath(ring, project)} Z`).join(" ");
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((polygon) => Array.isArray(polygon) ? polygon.map((ring) => `${ringPath(ring, project)} Z`) : []).join(" ");
  }
  if (geometry.type === "LineString") return ringPath(geometry.coordinates, project);
  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((line) => ringPath(line, project)).join(" ");
  }
  return "";
}

function featureLabelPoint(feature: GeoFeature, project: (point: [number, number]) => readonly [number, number]) {
  const projected = flattenCoordinates(feature.geometry?.coordinates).map(project);
  if (!projected.length) return null;
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  };
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}

function HierarchyCard({ level, title, detail, tone = "green" }: { level: string; title: string; detail: string; tone?: "red" | "green" | "blue" | "orange" }) {
  return (
    <article className={`level-card ${tone}`}>
      <span>{level}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </article>
  );
}

function BarList({
  rows,
  valueKey,
  labelKey,
  max,
  formatter: valueFormatter = formatNumber
}: {
  rows: DataRow[] | Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
  max?: number;
  formatter?: (value: number) => string;
}) {
  const largest = max ?? Math.max(...rows.map((row) => Number(row[valueKey] ?? 0)));
  return (
    <div className="bar-list">
      {rows.map((row) => {
        const value = Number(row[valueKey] ?? 0);
        const label = String(row[labelKey] ?? "");
        return (
          <div className="bar-row" key={label}>
            <span>{label}</span>
            <div className="bar-track">
              <div style={{ width: `${Math.max(2, (value / largest) * 100)}%` }} />
            </div>
            <b>{valueFormatter(value)}</b>
          </div>
        );
      })}
    </div>
  );
}

function DataMap({ layerId }: { layerId: string }) {
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(staticDataUrl(`geo/${layerId}.json`))
      .then((response) => response.json())
      .then((payload: GeoResponse) => {
        if (!cancelled) setGeo(payload);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [layerId]);

  const content = useMemo(() => {
    const features = geo?.geojson.features ?? [];
    if (!features.length) return null;
    const width = 720;
    const height = 620;
    const project = buildProjection(features, width, height);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={geo?.dataset.label} className="geo-svg">
        {features.map((feature, index) => {
          const geometry = feature.geometry;
          if (!geometry) return null;
          if (geometry.type === "Point") {
            const point = flattenCoordinates(geometry.coordinates)[0];
            if (!point) return null;
            const [x, y] = project(point);
            return <circle key={index} cx={x} cy={y} r={1.9} />;
          }
          return <path key={index} d={geometryPath(geometry, project)} />;
        })}
      </svg>
    );
  }, [geo]);

  return (
    <div className={`map-canvas ${layerId}`}>
      {loading ? <div className="loading">Loading map layer...</div> : content}
      <div className="map-meta">
        <Map size={16} />
        <span>{geo?.dataset.label ?? "Map layer"} · {formatNumber(geo?.geojson.features?.length ?? 0)} features</span>
      </div>
    </div>
  );
}

function HeroBangladeshMap() {
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 180, y: 215 });

  useEffect(() => {
    let cancelled = false;
    fetch(staticDataUrl("geo/bangladesh-boundaries.json"))
      .then((response) => response.json())
      .then((payload: GeoResponse) => {
        if (!cancelled) setGeo(payload);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const features = useMemo(() => geo?.geojson.features ?? [], [geo]);
  const width = 360;
  const height = 430;
  const project = useMemo(() => {
    if (!features.length) return null;
    return buildProjection(features, width, height);
  }, [features]);
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const viewX = Math.max(0, Math.min(width - viewWidth, center.x - viewWidth / 2));
  const viewY = Math.max(0, Math.min(height - viewHeight, center.y - viewHeight / 2));
  const viewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
  const labelLimit = zoom >= 2.6 ? 80 : zoom >= 1.8 ? 42 : zoom >= 1.25 ? 18 : 0;

  const localLabels = useMemo(() => {
    if (!project || labelLimit === 0) return [];
    const candidates = features
      .map((feature, index) => {
        const name = String(feature.properties?.name ?? "");
        const point = featureLabelPoint(feature, project);
        return point && name ? { name, index, ...point } : null;
      })
      .filter((item): item is { name: string; index: number; x: number; y: number } => Boolean(item))
      .filter((item) => item.x >= viewX && item.x <= viewX + viewWidth && item.y >= viewY && item.y <= viewY + viewHeight);

    const step = Math.max(1, Math.floor(candidates.length / labelLimit));
    return candidates.filter((_, index) => index % step === 0).slice(0, labelLimit);
  }, [features, labelLimit, project, viewHeight, viewWidth, viewX, viewY]);

  const setBoundedZoom = (nextZoom: number) => {
    setZoom(Math.max(1, Math.min(3.2, Number(nextZoom.toFixed(2)))));
  };

  const pan = (dx: number, dy: number) => {
    setCenter((current) => ({
      x: Math.max(viewWidth / 2, Math.min(width - viewWidth / 2, current.x + dx * viewWidth)),
      y: Math.max(viewHeight / 2, Math.min(height - viewHeight / 2, current.y + dy * viewHeight))
    }));
  };

  const resetMap = () => {
    setZoom(1);
    setCenter({ x: width / 2, y: height / 2 });
  };

  if (!project) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} aria-label="Loading map of Bangladesh">
        <path className="country-shape fallback" d="M112 28 82 61l12 51-32 54 27 55-3 52 37 47 31 68 49-49 46 64 42-74 47-47-7-72 37-56-40-64-55-22-43-47-61 24-44-30Z" />
      </svg>
    );
  }

  return (
    <div
      className="hero-map-shell"
      onWheel={(event) => {
        event.preventDefault();
        setBoundedZoom(zoom + (event.deltaY > 0 ? -0.2 : 0.2));
      }}
    >
      <svg viewBox={viewBox} aria-label="Zoomable real map of Bangladesh">
        <g className="real-boundaries">
          {features.map((feature, index) => (
            <path key={index} d={geometryPath(feature.geometry, project)} />
          ))}
        </g>
        <g className="zoom-labels">
          {localLabels.map((label) => (
            <text key={`${label.name}-${label.index}`} x={label.x + 2} y={label.y - 2}>{label.name}</text>
          ))}
        </g>
        <g className="hero-cities">
          {heroCities.map((city) => {
            const [x, y] = project([city.lon, city.lat]);
            return (
              <g key={city.name}>
                {city.primary ? <circle className="dhaka-pulse" cx={x} cy={y} r="11" /> : null}
                <circle className={city.primary ? "dhaka-dot" : "city-dot"} cx={x} cy={y} r={city.primary ? 5 : 3} />
                <text className={city.primary ? "dhaka-label" : "city-label"} x={x + 7} y={y - 3}>{city.name}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="hero-map-controls" aria-label="Hero map controls">
        <button type="button" aria-label="Zoom in" onClick={() => setBoundedZoom(zoom + 0.35)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setBoundedZoom(zoom - 0.35)} disabled={zoom <= 1}>-</button>
        <button type="button" aria-label="Reset map zoom" onClick={resetMap}>Reset</button>
      </div>
      {zoom > 1 ? (
        <div className="hero-map-pan" aria-label="Pan hero map">
          <button type="button" aria-label="Pan map north" onClick={() => pan(0, -0.35)}>↑</button>
          <button type="button" aria-label="Pan map west" onClick={() => pan(-0.35, 0)}>←</button>
          <button type="button" aria-label="Pan map east" onClick={() => pan(0.35, 0)}>→</button>
          <button type="button" aria-label="Pan map south" onClick={() => pan(0, 0.35)}>↓</button>
        </div>
      ) : null}
      <span className="hero-map-hint">{zoom === 1 ? "Zoom for names" : `${localLabels.length} local names`}</span>
    </div>
  );
}

function TerritoryFinder() {
  const [rows, setRows] = useState<ThanaProfile[]>([]);
  const [query, setQuery] = useState("Dhaka");
  const [selectedKey, setSelectedKey] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;
    fetch(staticDataUrl("thanas.json"))
      .then((response) => response.json())
      .then((payload: ThanaResponse) => {
        if (cancelled) return;
        setRows(payload.rows);
        setSelectedKey(payload.rows.find((row) => row.thana === "Adabor" && row.district === "Dhaka")?.sourceKey ?? payload.rows[0]?.sourceKey ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    if (!rows.length) return [];
    const needle = deferredQuery;
    const candidates = needle
      ? rows.filter((row) => [row.thana, row.district, row.division, row.consumerProfile, row.primarySector]
        .join(" ")
        .toLowerCase()
        .includes(needle))
      : rows;
    return candidates.slice(0, 7);
  }, [deferredQuery, rows]);

  const selected = rows.find((row) => row.sourceKey === selectedKey);
  const activeProfile = matches[0] ?? selected ?? rows[0];
  const totalMatches = deferredQuery ? rows.filter((row) => [row.thana, row.district, row.division, row.consumerProfile, row.primarySector]
    .join(" ")
    .toLowerCase()
    .includes(deferredQuery)).length : rows.length;

  return (
    <section className="territory-finder" id="finder" aria-label="Territory finder">
      <div className="finder-copy">
        <span className="mono-label">Territory finder</span>
        <h2>Search any thana and read its market profile.</h2>
        <label className="finder-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search thana, district, sector, or profile"
          />
        </label>
        <div className="finder-results" aria-label="Matching territories">
          {matches.map((row) => (
            <button
              key={row.sourceKey}
              type="button"
              className={row.sourceKey === activeProfile?.sourceKey ? "active" : ""}
              onClick={() => {
                setQuery(`${row.thana}, ${row.district}`);
                setSelectedKey(row.sourceKey);
              }}
            >
              <strong>{row.thana}</strong>
              <span>{row.district} · {row.division}</span>
            </button>
          ))}
        </div>
        <small>{formatNumber(totalMatches)} matching territories · dataset-1 source</small>
      </div>

      <article className="territory-card">
        {activeProfile ? (
          <>
            <div className="territory-card-title">
              <span><MapPin size={15} /> {activeProfile.district} / {activeProfile.division}</span>
              <b className={`priority-badge priority-${activeProfile.distributionPriority.toLowerCase()}`}>
                Priority {activeProfile.distributionPriority}
              </b>
            </div>
            <h3>{activeProfile.thana}</h3>
            <div className="territory-metrics">
              <div>
                <UsersRound size={18} />
                <strong>{formatProfileNumber(activeProfile.population)}</strong>
                <span>Population</span>
              </div>
              <div>
                <Map size={18} />
                <strong>{formatProfileNumber(activeProfile.densityPerSqKm, " /km2")}</strong>
                <span>Density</span>
              </div>
              <div>
                <BadgeCheck size={18} />
                <strong>{activeProfile.thanaType}</strong>
                <span>Admin type</span>
              </div>
            </div>
            <div className="territory-profile-grid">
              <div>
                <span>Primary sector</span>
                <strong>{activeProfile.primarySector}</strong>
                <small>{activeProfile.subActivity}</small>
              </div>
              <div>
                <span>Market class</span>
                <strong>{activeProfile.marketClassification}</strong>
                <small>{activeProfile.fmcgTradeClass}</small>
              </div>
              <div>
                <span>Consumer profile</span>
                <strong>{activeProfile.consumerProfile}</strong>
                <small>{activeProfile.likelyTopFmcgCategories}</small>
              </div>
            </div>
            <div className="territory-route">
              <Store size={18} />
              <span>{activeProfile.marketClassification} route · {activeProfile.fmcgTradeClass}</span>
            </div>
          </>
        ) : (
          <div className="territory-empty">Loading territory profiles...</div>
        )}
      </article>
    </section>
  );
}

function DataTable({ selectedDataset }: { selectedDataset: string }) {
  const [payload, setPayload] = useState<DatasetResponse | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    fetch(staticDataUrl(`datasets/${selectedDataset}.json`))
      .then((response) => response.json())
      .then((data: DatasetResponse) => {
        if (!cancelled) setPayload(data);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDataset]);

  const rows = useMemo(() => payload?.rows ?? [], [payload]);
  const headers = rows[0] ? Object.keys(rows[0]).slice(0, 9) : [];
  const filteredRows = useMemo(() => {
    if (!deferredQuery) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(deferredQuery)));
  }, [rows, deferredQuery]);
  const visibleRows = filteredRows.slice(0, 160);

  return (
    <div className="data-table-shell">
      <div className="table-tools">
        <div>
          <strong>{payload?.dataset.label ?? "Loading dataset"}</strong>
          <span>{formatNumber(filteredRows.length)} of {formatNumber(rows.length)} rows</span>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any field" />
        </label>
        <button className="icon-button" type="button" onClick={() => downloadRows(payload?.dataset ?? null, filteredRows)}>
          <ArrowDownToLine size={17} />
          CSV
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={index}>
                {headers.map((header) => <td key={header}>{String(row[header] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BangladeshDataApp({ initialData }: { initialData: DashboardData }) {
  const [metric, setMetric] = useState<"population" | "thanas" | "density">("population");
  const [layerId, setLayerId] = useState("bangladesh-boundaries");
  const [datasetId, setDatasetId] = useState("authoritative-thanas");
  const [, startTransition] = useTransition();

  const rankedDivisions = useMemo(() => {
    return [...initialData.divisions].sort((a, b) => b[metric] - a[metric]);
  }, [initialData.divisions, metric]);

  const metricLabel = metric === "population" ? "Population" : metric === "thanas" ? "Thanas" : "Density";

  return (
    <main>
      <header className="topbar">
        <a href="#home" className="brand">
          <span className="flag-mark" />
          <span className="brand-mono">Thana Dataset</span>
        </a>
        <nav>
          <a href="#scale">Scale</a>
          <a href="#finder">Finder</a>
          <a href="#divisions">Divisions</a>
          <a href="#economy">Economy</a>
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <span className="hero-kicker">Bangladesh · 2022</span>
          <h1>A portrait of a nation, <em>thana by thana.</em></h1>
          <p>
            Every one of Bangladesh&apos;s 554 sub-districts, its people, its land,
            the work it does, and how it shops, mapped into a single structured record.
            This is the country at its most granular.
          </p>
          <div className="hero-actions">
            <a href="#scale">Explore the data</a>
            <a href="#finder">Find a thana</a>
          </div>
        </div>
        <div className="map-card">
          <HeroBangladeshMap />
        </div>
      </section>

      <section className="stats-grid" id="scale" aria-label="National data summary">
        <Stat label="Thanas / Upazilas" value={formatNumber(initialData.totals.thanas)} detail="dataset-1 source of truth" />
        <Stat label="Districts" value={formatNumber(initialData.totals.districts)} detail="administrative districts" />
        <Stat label="Divisions" value={formatNumber(initialData.totals.divisions)} detail="regional divisions" />
        <Stat label="People (BBS 2022)" value={compactFormatter.format(initialData.totals.population)} detail={`${formatNumber(initialData.totals.area)} km2 · ${formatNumber(initialData.totals.density)} /km2`} />
      </section>

      <section className="source-strip" aria-label="Dataset source policy">
        <div>
          <span className="mono-label">Source rule</span>
          <strong>Dataset-1 is authoritative for all thana/upazila records.</strong>
        </div>
        <p>
          Dataset-2 supports geography: {formatNumber(initialData.totals.geoBoundaries)} map features,
          {` ${formatNumber(initialData.totals.geoUpazilas)} `}geographic upazila names,
          and {formatNumber(initialData.dataQuality.districtAliases + initialData.dataQuality.thanaAliases)} aliases for safer joins.
        </p>
      </section>

      <TerritoryFinder />

      <section className="section hierarchy">
        <span className="mono-label">Administrative Nesting</span>
        <h2>How the country nests together</h2>
        <p className="section-copy">
          Bangladesh&apos;s administration runs four levels deep. The dataset records
          the smallest of them, the thana, and rolls it up to the nation.
        </p>
        <div className="hierarchy-grid">
          <HierarchyCard level="Level 1" title="Country" detail="1 · Bangladesh" tone="red" />
          <HierarchyCard level="Level 2" title="Division" detail="8 · বিভাগ" tone="green" />
          <HierarchyCard level="Level 3" title="District" detail="64 · জেলা" tone="blue" />
          <HierarchyCard level="Level 4" title="Thana" detail="554 · উপজেলা" tone="orange" />
        </div>
      </section>

      <section className="section dark" id="divisions">
        <div className="section-heading">
          <div>
            <span className="mono-label">The 8 divisions</span>
            <h2>Dhaka holds a third of everyone</h2>
            <p className="dark-copy">
              Population is heavily concentrated. The Dhaka division alone counts
              35.3M people across 127 thanas.
            </p>
          </div>
          <div className="segmented">
            {(["population", "thanas", "density"] as const).map((option) => (
              <button key={option} type="button" className={metric === option ? "active" : ""} onClick={() => setMetric(option)}>
                {option === "population" ? "Population" : option === "thanas" ? "Thanas" : "Density"}
              </button>
            ))}
          </div>
        </div>
        <BarList
          rows={rankedDivisions}
          labelKey="name"
          valueKey={metric}
          formatter={(value) => metric === "population" ? compactFormatter.format(value) : metric === "density" ? `${formatNumber(value)} /km2` : `${formatNumber(value)} thanas`}
        />
        <p className="dark-note">Showing: {metricLabel.toLowerCase()} · ranked high to low</p>
      </section>

      <section className="section economy" id="economy">
        <div>
          <span className="mono-label">What the land does</span>
          <h2>An economy still rooted in the field</h2>
          <p className="section-copy">
            Seven in ten thanas are primarily agricultural, and traditional retail
            dominates almost everywhere. Modern trade is still a rounding error.
          </p>
        </div>
        <div className="economy-stack">
          <article>
            <h3>Primary sector</h3>
            <BarList rows={initialData.sectors} labelKey="name" valueKey="count" />
          </article>
          <article>
            <h3>Market classification</h3>
            <BarList rows={initialData.marketClass} labelKey="name" valueKey="count" />
          </article>
          <article>
            <h3>FMCG trade class</h3>
            <BarList rows={initialData.tradeClass} labelKey="name" valueKey="count" />
          </article>
        </div>
      </section>

      <section className="section fmcg" id="fmcg">
        <div className="section-heading">
          <div>
            <span className="mono-label">Who buys, and where</span>
            <h2>A distribution map for 554 territories</h2>
            <p className="section-copy">
              Each thana carries a consumer profile and a distribution priority,
              a ready-made route-to-market guide for the country.
            </p>
          </div>
        </div>
        <div className="priority-cards">
          {initialData.priorities.map((item) => (
            <article key={item.name} className={`priority-card priority-${item.name.toLowerCase()}`}>
              <span>{item.name}</span>
              <strong>{item.count}</strong>
              <small>{item.pct}% of thanas</small>
            </article>
          ))}
        </div>
        <div className="consumer-heading">
          <h3>Consumer profiles by thana count</h3>
          <span>Top 9 segments</span>
        </div>
        <div className="segment-grid">
          {initialData.segments.slice(0, 9).map((segment) => (
            <article key={segment.name} className={`segment priority-${segment.priority.toLowerCase()}`}>
              <span>{segment.priority}</span>
              <strong>{segment.name}</strong>
              <small>{segment.count} thanas · {segment.pct}%</small>
            </article>
          ))}
        </div>
      </section>

      <section className="section dark atlas-extension" id="atlas">
        <div className="section-heading">
          <div>
            <span className="mono-label">Full Data Atlas</span>
            <h2>Boundaries, routes, and market points in one viewer.</h2>
          </div>
          <div className="segmented">
            {layerOptions.map((layer) => (
              <button
                key={layer.id}
                className={layer.id === layerId ? "active" : ""}
                type="button"
                onClick={() => startTransition(() => setLayerId(layer.id))}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
        <DataMap layerId={layerId} />
      </section>

      <section className="section catalog" id="catalog">
        <div className="section-heading">
          <div>
            <span className="mono-label">All Bangladesh Data</span>
            <h2>Every source, plus the normalized thana table.</h2>
          </div>
          <Database size={34} />
        </div>
        <div className="catalog-grid">
          {initialData.datasets.map((dataset) => (
            <button
              type="button"
              key={dataset.id}
              className={dataset.id === datasetId ? "dataset-card active" : "dataset-card"}
              onClick={() => {
                setDatasetId(dataset.id);
                document.getElementById("data")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>{dataset.group}</span>
              <strong>{dataset.label}</strong>
              <small>{dataset.format.toUpperCase()} · {dataset.path}</small>
              <p>{dataset.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="section data-section" id="data">
        <div className="section-heading">
          <div>
            <span className="mono-label">Raw Explorer</span>
            <h2>Search and export any dataset.</h2>
          </div>
          <div className="dataset-select">
            <Table2 size={17} />
            <select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>
              {initialData.datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>{dataset.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable selectedDataset={datasetId} />
      </section>

      <footer>
        <div>
          <span className="flag-mark" />
          <strong>Portrait of Bangladesh</strong>
        </div>
        <p>
          Built as a full Next.js application from `dataset-1`, `dataset-2`, and the imported Claude Design reference.
        </p>
        <span><Activity size={14} /> {initialData.datasets.length} datasets indexed · <Waypoints size={14} /> {formatNumber(initialData.totals.routes)} route features</span>
      </footer>
    </main>
  );
}
