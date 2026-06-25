import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import { canonicalThana, districtAliases, geoNameKey, normalizeName, thanaAliases, thanaKey } from "./admin-normalize";

export type DataRow = Record<string, string | number | null>;

export type DatasetDefinition = {
  id: string;
  label: string;
  group: "Economic" | "Geography" | "Reference" | "Normalized" | "Imported Design";
  format: "csv" | "json" | "geojson" | "xlsx";
  path: string;
  description: string;
};

export type DashboardData = {
  datasets: DatasetDefinition[];
  totals: {
    divisions: number;
    districts: number;
    upazilas: number;
    thanas: number;
    population: number;
    area: number;
    density: number;
    bazars: number;
    routes: number;
    postcodes: number;
    dhakaLocalities: number;
    geoUpazilas: number;
    geoBoundaries: number;
    cityThanas: number;
  };
  dataQuality: {
    sourceOfTruth: string;
    districtAliases: number;
    thanaAliases: number;
    geoFeaturesMatchedToDataset1: number;
    geoFeaturesMissingAdminIds: number;
    bazarsMissingAdminIds: number;
    postcodesMissingDistrictId: number;
  };
  divisions: Array<{
    name: string;
    code: string;
    thanas: number;
    population: number;
    area: number;
    density: number;
  }>;
  sectors: Array<{ name: string; count: number; pct: number }>;
  marketClass: Array<{ name: string; count: number; pct: number }>;
  tradeClass: Array<{ name: string; count: number; pct: number }>;
  priorities: Array<{ name: string; count: number; pct: number }>;
  segments: Array<{ name: string; count: number; priority: string; pct: number }>;
  districtLeaders: {
    population: DataRow[];
    density: DataRow[];
    area: DataRow[];
  };
};

const root = process.cwd();

export const datasets: DatasetDefinition[] = [
  {
    id: "summary-division",
    label: "Division Summary",
    group: "Economic",
    format: "csv",
    path: "dataset-1/summary_division.csv",
    description: "Population, area, density, and thana counts by division."
  },
  {
    id: "summary-district",
    label: "District Summary",
    group: "Economic",
    format: "csv",
    path: "dataset-1/summary_district.csv",
    description: "Population, area, density, and thana counts by district."
  },
  {
    id: "summary-sector",
    label: "Sector Summary",
    group: "Economic",
    format: "csv",
    path: "dataset-1/summary_sector.csv",
    description: "Primary economic sector count and share across all thanas."
  },
  {
    id: "economic-workbook",
    label: "BD Thana Economic Profile Workbook",
    group: "Economic",
    format: "xlsx",
    path: "dataset-1/BD_Thana_Economic_Profile.xlsx",
    description: "Original Excel workbook version of the thana economic profile dataset."
  },
  {
    id: "thana-reference",
    label: "Thana Reference",
    group: "Reference",
    format: "csv",
    path: "dataset-1/thana_reference.csv",
    description: "Administrative hierarchy, type, population, area, and codes for every thana."
  },
  {
    id: "authoritative-thanas",
    label: "Authoritative Thana Profiles",
    group: "Normalized",
    format: "json",
    path: "generated/dataset-1-authoritative-thanas",
    description: "Dataset-1 source-of-truth thana records joined with economic activity and FMCG profile fields."
  },
  {
    id: "thana-economic",
    label: "Thana Economic Activity",
    group: "Economic",
    format: "csv",
    path: "dataset-1/thana_economic_activity.csv",
    description: "Dominant livelihood, sector, market classification, and FMCG trade class."
  },
  {
    id: "thana-fmcg",
    label: "Thana FMCG Consumer Profile",
    group: "Economic",
    format: "csv",
    path: "dataset-1/thana_fmcg_consumer_profile.csv",
    description: "Consumer profile tags, likely FMCG categories, and distribution priority."
  },
  {
    id: "divisions",
    label: "Division Coordinates",
    group: "Geography",
    format: "json",
    path: "dataset-2/bd-divisions.json",
    description: "Division names in English and Bangla with centroid coordinates."
  },
  {
    id: "districts",
    label: "District Coordinates",
    group: "Geography",
    format: "json",
    path: "dataset-2/bd-districts.json",
    description: "District names in English and Bangla with centroid coordinates."
  },
  {
    id: "upazilas",
    label: "Upazila Names",
    group: "Geography",
    format: "json",
    path: "dataset-2/bd-upazilas.json",
    description: "Upazila names in English and Bangla linked to districts."
  },
  {
    id: "postcodes",
    label: "Postcodes",
    group: "Geography",
    format: "json",
    path: "dataset-2/bd-postcodes.json",
    description: "Postal areas and postcodes by division, district, and upazila."
  },
  {
    id: "dhaka-city",
    label: "Dhaka City Localities",
    group: "Geography",
    format: "json",
    path: "dataset-2/dhaka-city.json",
    description: "Dhaka North and South city locality names in English and Bangla."
  },
  {
    id: "bangladesh-boundaries",
    label: "Bangladesh Upazila Boundaries",
    group: "Geography",
    format: "geojson",
    path: "dataset-2/bangladesh.geojson",
    description: "Upazila boundary polygons for the national map."
  },
  {
    id: "bangladesh-boundaries-meta",
    label: "Bangladesh Boundary Metadata",
    group: "Geography",
    format: "json",
    path: "dataset-2/bangladesh.geojson.meta.json",
    description: "Metadata for the Bangladesh upazila boundary GeoJSON source."
  },
  {
    id: "bazars",
    label: "Bazars",
    group: "Geography",
    format: "geojson",
    path: "dataset-2/bd-bazars.geojson",
    description: "Market and bazar point locations from OpenStreetMap."
  },
  {
    id: "major-routes",
    label: "Major Routes",
    group: "Geography",
    format: "geojson",
    path: "dataset-2/bd-major-routes.geojson",
    description: "Major national and regional road geometries."
  },
  {
    id: "imported-design",
    label: "Claude Design Export",
    group: "Imported Design",
    format: "json",
    path: "Website visual for dataset/Portrait of Bangladesh.dc.html",
    description: "The imported Claude Design visual reference used for this site's art direction."
  }
];

function abs(filePath: string) {
  return path.join(root, filePath);
}

function cleanBom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      quoted = !quoted;
      continue;
    }

    if (ch === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += ch;
  }

  cells.push(cell.trim());
  return cells;
}

export async function readCsv(filePath: string): Promise<DataRow[]> {
  const raw = cleanBom(await fs.readFile(abs(filePath), "utf8"));
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<DataRow>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

export async function readJson(filePath: string) {
  return JSON.parse(await fs.readFile(abs(filePath), "utf8")) as unknown;
}

function num(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function countBy(rows: DataRow[], key: string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const name = String(row[key] ?? "Unknown");
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Number(((count / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.count - a.count);
}

function rowsFromJsonShape(data: unknown): DataRow[] {
  if (Array.isArray(data)) return data as DataRow[];
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  if (Array.isArray(object.features)) {
    return object.features.map((feature) => {
      const item = feature as { properties?: DataRow; geometry?: { type?: string } };
      return {
        ...(item.properties ?? {}),
        geometryType: item.geometry?.type ?? null
      };
    });
  }
  const firstArray = Object.values(object).find(Array.isArray);
  if (firstArray) return firstArray as DataRow[];
  return Object.entries(object).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
}

function indexByThana(rows: DataRow[]) {
  return new Map(rows.map((row) => [thanaKey(row), row]));
}

export async function getAuthoritativeThanaRows() {
  const [referenceRows, economicRows, fmcgRows] = await Promise.all([
    readCsv("dataset-1/thana_reference.csv"),
    readCsv("dataset-1/thana_economic_activity.csv"),
    readCsv("dataset-1/thana_fmcg_consumer_profile.csv")
  ]);
  const economicByKey = indexByThana(economicRows);
  const fmcgByKey = indexByThana(fmcgRows);

  return referenceRows.map((reference) => {
    const key = thanaKey(reference);
    const economic = economicByKey.get(key) ?? {};
    const fmcg = fmcgByKey.get(key) ?? {};
    return {
      division: reference.Division,
      district: reference.District,
      thana: reference["Thana / Upazila"],
      thanaType: reference["Thana Type"],
      population: reference["Population (Est. 2022)"],
      areaSqKm: reference["Area (sq km)"],
      densityPerSqKm: reference["Pop. Density (per sq km)"],
      primarySector: economic["Primary Sector"] ?? fmcg["Primary Sector"] ?? "",
      subActivity: economic["Sub-Activity (Dominant Livelihood)"] ?? "",
      marketClassification: economic["Market Classification"] ?? fmcg["Market Classification"] ?? "",
      fmcgTradeClass: economic["FMCG Trade Class"] ?? fmcg["FMCG Trade Class"] ?? "",
      consumerProfile: fmcg["Consumer Profile Tag"] ?? "",
      likelyTopFmcgCategories: fmcg["Likely Top FMCG Categories"] ?? "",
      distributionPriority: fmcg["Distribution Priority"] ?? "",
      divisionCode: reference["Division Code"],
      districtCode: reference["District Code"],
      sourceKey: key
    };
  });
}

function countMissingAdminIds(features: Array<{ properties?: DataRow }>) {
  return features.filter((feature) => {
    const props = feature.properties ?? {};
    return !props.division_id || !props.district_id || !props.upazila_id;
  }).length;
}

function countPostcodesMissingDistrictId(rows: DataRow[]) {
  return rows.filter((row) => !row.district_id).length;
}

function countGeoMatchesToDataset1(features: Array<{ properties?: DataRow }>, referenceRows: DataRow[]) {
  const dataset1Names = new Set(referenceRows.map((row) => normalizeName(canonicalThana(row["Thana / Upazila"]))));
  return features.filter((feature) => dataset1Names.has(geoNameKey(feature.properties?.name))).length;
}

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const [
    divisionRows,
    districtRows,
    sectorRows,
    referenceRows,
    economicRows,
    fmcgRows,
    divisionsJson,
    districtsJson,
    upazilasJson,
    postcodesJson,
    dhakaJson,
    bazarsGeo,
    routesGeo
  ] = await Promise.all([
    readCsv("dataset-1/summary_division.csv"),
    readCsv("dataset-1/summary_district.csv"),
    readCsv("dataset-1/summary_sector.csv"),
    readCsv("dataset-1/thana_reference.csv"),
    readCsv("dataset-1/thana_economic_activity.csv"),
    readCsv("dataset-1/thana_fmcg_consumer_profile.csv"),
    readJson("dataset-2/bd-divisions.json"),
    readJson("dataset-2/bd-districts.json"),
    readJson("dataset-2/bd-upazilas.json"),
    readJson("dataset-2/bd-postcodes.json"),
    readJson("dataset-2/dhaka-city.json"),
    readJson("dataset-2/bd-bazars.geojson"),
    readJson("dataset-2/bd-major-routes.geojson")
  ]);
  const geoFeatures = (bazarsGeo as { features?: Array<{ properties?: DataRow }> }).features ?? [];
  const boundaryFeatures = (await readJson("dataset-2/bangladesh.geojson") as { features?: Array<{ properties?: DataRow }> }).features ?? [];
  const postcodeRows = rowsFromJsonShape(postcodesJson);

  const totalDivisionRow = divisionRows.find((row) => String(row.Division).toLowerCase().startsWith("total"));
  const divisionData = divisionRows.filter((row) => !String(row.Division).toLowerCase().startsWith("total")).map((row) => ({
    name: String(row.Division),
    code: String(row["Division Code"]),
    thanas: num(row["No. of Thanas/Upazilas"]),
    population: num(row["Total Population (Est.)"]),
    area: num(row["Total Area (sq km)"]),
    density: num(row["Pop. Density (per sq km)"])
  }));

  const population = totalDivisionRow ? num(totalDivisionRow["Total Population (Est.)"]) : divisionData.reduce((sum, row) => sum + row.population, 0);
  const area = totalDivisionRow ? num(totalDivisionRow["Total Area (sq km)"]) : divisionData.reduce((sum, row) => sum + row.area, 0);
  const priorityCounts = countBy(fmcgRows, "Distribution Priority")
    .sort((a, b) => ["A", "B", "C"].indexOf(a.name) - ["A", "B", "C"].indexOf(b.name));
  const priorityBySegment = new Map<string, string>();
  fmcgRows.forEach((row) => {
    priorityBySegment.set(String(row["Consumer Profile Tag"]), String(row["Distribution Priority"]));
  });

  return {
    datasets,
    totals: {
      divisions: rowsFromJsonShape(divisionsJson).length,
      districts: rowsFromJsonShape(districtsJson).length,
      upazilas: referenceRows.length,
      thanas: referenceRows.length,
      population,
      area,
      density: Math.round(population / area),
      bazars: rowsFromJsonShape(bazarsGeo).length,
      routes: rowsFromJsonShape(routesGeo).length,
      postcodes: postcodeRows.length,
      dhakaLocalities: rowsFromJsonShape(dhakaJson).length,
      geoUpazilas: rowsFromJsonShape(upazilasJson).length,
      geoBoundaries: boundaryFeatures.length,
      cityThanas: referenceRows.filter((row) => String(row["Thana Type"]).includes("City")).length
    },
    dataQuality: {
      sourceOfTruth: "dataset-1/thana_reference.csv",
      districtAliases: Object.keys(districtAliases).length,
      thanaAliases: Object.keys(thanaAliases).length,
      geoFeaturesMatchedToDataset1: countGeoMatchesToDataset1(boundaryFeatures, referenceRows),
      geoFeaturesMissingAdminIds: countMissingAdminIds(boundaryFeatures),
      bazarsMissingAdminIds: countMissingAdminIds(geoFeatures),
      postcodesMissingDistrictId: countPostcodesMissingDistrictId(postcodeRows)
    },
    divisions: divisionData,
    sectors: sectorRows
      .filter((row) => ["Agriculture", "Services", "Industry"].includes(String(row["Primary Sector"])))
      .map((row) => ({
        name: String(row["Primary Sector"]),
        count: num(row["Thana Count"]),
        pct: num(row["% of Total"])
      })),
    marketClass: countBy(economicRows, "Market Classification"),
    tradeClass: countBy(economicRows, "FMCG Trade Class"),
    priorities: priorityCounts,
    segments: countBy(fmcgRows, "Consumer Profile Tag").map((segment) => ({
      ...segment,
      priority: priorityBySegment.get(segment.name) ?? "C"
    })),
    districtLeaders: {
      population: [...districtRows].sort((a, b) => num(b["Total Population"]) - num(a["Total Population"])).slice(0, 8),
      density: [...districtRows].sort((a, b) => num(b["Pop. Density (per sq km)"]) - num(a["Pop. Density (per sq km)"])).slice(0, 8),
      area: [...districtRows].sort((a, b) => num(b["Total Area (sq km)"]) - num(a["Total Area (sq km)"])).slice(0, 8)
    }
  };
});

export async function getDatasetRows(id: string) {
  const dataset = datasets.find((item) => item.id === id);
  if (!dataset) return null;
  if (dataset.id === "authoritative-thanas") {
    return { dataset, rows: await getAuthoritativeThanaRows() };
  }
  if (dataset.format === "xlsx") {
    const stat = await fs.stat(abs(dataset.path));
    return { dataset, rows: [{ file: dataset.path, bytes: stat.size, note: "Excel workbook represented as a source file. The CSV sheets are available as searchable datasets." }] };
  }
  if (dataset.format === "csv") return { dataset, rows: await readCsv(dataset.path) };
  if (dataset.id === "imported-design") {
    const html = await fs.readFile(abs(dataset.path), "utf8");
    return { dataset, rows: [{ file: dataset.path, bytes: html.length, title: "Portrait of Bangladesh.dc.html" }] };
  }
  return { dataset, rows: rowsFromJsonShape(await readJson(dataset.path)) };
}

export async function getGeoJson(id: string) {
  const allowed = new Set(["bangladesh-boundaries", "bazars", "major-routes"]);
  const dataset = datasets.find((item) => item.id === id && allowed.has(item.id));
  if (!dataset) return null;
  return { dataset, geojson: await readJson(dataset.path) };
}
