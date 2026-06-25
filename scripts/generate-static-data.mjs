import { promises as fs } from "fs";
import path from "path";

const root = process.cwd();
const publicDataDir = path.join(root, "public", "data");

const districtAliases = {
  "chapai nawabganj": "Chapai Nawabganj",
  chapinawabganj: "Chapai Nawabganj",
  nawabganj: "Chapai Nawabganj",
  comilla: "Comilla",
  cumilla: "Comilla",
  jessore: "Jessore",
  jashore: "Jessore",
  khagrachhari: "Khagrachhari",
  khagrachari: "Khagrachhari",
  moulvibazar: "Moulvibazar",
  maulvibazar: "Moulvibazar",
  sirajganj: "Sirajganj",
  sirajgonj: "Sirajganj"
};

const thanaAliases = {
  abhaynagar: "Abhaynagor",
  abhaynagor: "Abhaynagor",
  astagram: "Austagram",
  austagram: "Austagram",
  bagaichhari: "Baghaichhari",
  "baghai chhari": "Baghaichhari",
  baniachang: "Baniachong",
  baniachong: "Baniachong",
  "barisal sadar": "Barishal Sadar",
  "barishal sadar": "Barishal Sadar",
  "bayejid bostami": "Bayazid",
  bayazid: "Bayazid",
  "biman bandar": "Airport",
  "chak bazar": "Chawkbazar",
  chawkbazar: "Chawkbazar",
  "chittagong port": "Bandar",
  "comilla adarsha sadar": "Comilla Sadar",
  "comilla sadar dakshin": "Comilla Sadar South",
  daganbhyan: "Daganbhuiyan",
  daganbhuiyan: "Daganbhuiyan",
  fhulgazi: "Fulgazi",
  fulgazi: "Fulgazi",
  hatia: "Hatiya",
  hatiya: "Hatiya",
  jointapur: "Jaintiapur",
  jaintiapur: "Jaintiapur",
  kobirhat: "Kabir Hat",
  kabirhat: "Kabir Hat",
  "kabir hat": "Kabir Hat",
  kaliakior: "Kaliakair",
  kaliakair: "Kaliakair",
  "kamrangir char": "Kamrangirchar",
  kamrangirchar: "Kamrangirchar",
  lohajang: "Louhajang",
  louhajang: "Louhajang",
  "matlab dakshin": "Matlab South",
  "matlab dakkhin": "Matlab South",
  "matlab south": "Matlab South",
  "matlab uttar": "Matlab North",
  "matlab north": "Matlab North",
  manoharganj: "Monoharganj",
  monoharganj: "Monoharganj",
  monohardi: "Monohardi",
  manohardi: "Monohardi",
  "maulvi bazar sadar": "Moulvibazar Sadar",
  "moulvibazar sadar": "Moulvibazar Sadar",
  patharghata: "Pathorghata",
  pathorghata: "Pathorghata",
  royganj: "Raiganj",
  raiganj: "Raiganj",
  roypura: "Raipura",
  raipura: "Raipura",
  rupsa: "Rupsha",
  rupsha: "Rupsha",
  shajahanpur: "Shahjahanpur",
  shahjahanpur: "Shahjahanpur",
  shibalaya: "Shivalaya",
  shivalaya: "Shivalaya",
  "dakshin surma": "South Surma",
  "south surma": "South Surma",
  subarnachar: "Subarna Char",
  "subarna char": "Subarna Char",
  tentulia: "Tetulia",
  tetulia: "Tetulia"
};

const datasets = [
  { id: "summary-division", label: "Division Summary", group: "Economic", format: "csv", path: "dataset-1/summary_division.csv", description: "Population, area, density, and thana counts by division." },
  { id: "summary-district", label: "District Summary", group: "Economic", format: "csv", path: "dataset-1/summary_district.csv", description: "Population, area, density, and thana counts by district." },
  { id: "summary-sector", label: "Sector Summary", group: "Economic", format: "csv", path: "dataset-1/summary_sector.csv", description: "Primary economic sector count and share across all thanas." },
  { id: "economic-workbook", label: "BD Thana Economic Profile Workbook", group: "Economic", format: "xlsx", path: "dataset-1/BD_Thana_Economic_Profile.xlsx", description: "Original Excel workbook version of the thana economic profile dataset." },
  { id: "thana-reference", label: "Thana Reference", group: "Reference", format: "csv", path: "dataset-1/thana_reference.csv", description: "Administrative hierarchy, type, population, area, and codes for every thana." },
  { id: "authoritative-thanas", label: "Authoritative Thana Profiles", group: "Normalized", format: "json", path: "generated/dataset-1-authoritative-thanas", description: "Dataset-1 source-of-truth thana records joined with economic activity and FMCG profile fields." },
  { id: "thana-economic", label: "Thana Economic Activity", group: "Economic", format: "csv", path: "dataset-1/thana_economic_activity.csv", description: "Dominant livelihood, sector, market classification, and FMCG trade class." },
  { id: "thana-fmcg", label: "Thana FMCG Consumer Profile", group: "Economic", format: "csv", path: "dataset-1/thana_fmcg_consumer_profile.csv", description: "Consumer profile tags, likely FMCG categories, and distribution priority." },
  { id: "divisions", label: "Division Coordinates", group: "Geography", format: "json", path: "dataset-2/bd-divisions.json", description: "Division names in English and Bangla with centroid coordinates." },
  { id: "districts", label: "District Coordinates", group: "Geography", format: "json", path: "dataset-2/bd-districts.json", description: "District names in English and Bangla with centroid coordinates." },
  { id: "upazilas", label: "Upazila Names", group: "Geography", format: "json", path: "dataset-2/bd-upazilas.json", description: "Upazila names in English and Bangla linked to districts." },
  { id: "postcodes", label: "Postcodes", group: "Geography", format: "json", path: "dataset-2/bd-postcodes.json", description: "Postal areas and postcodes by division, district, and upazila." },
  { id: "dhaka-city", label: "Dhaka City Localities", group: "Geography", format: "json", path: "dataset-2/dhaka-city.json", description: "Dhaka North and South city locality names in English and Bangla." },
  { id: "bangladesh-boundaries", label: "Bangladesh Upazila Boundaries", group: "Geography", format: "geojson", path: "dataset-2/bangladesh.geojson", description: "Upazila boundary polygons for the national map." },
  { id: "bangladesh-boundaries-meta", label: "Bangladesh Boundary Metadata", group: "Geography", format: "json", path: "dataset-2/bangladesh.geojson.meta.json", description: "Metadata for the Bangladesh upazila boundary GeoJSON source." },
  { id: "bazars", label: "Bazars", group: "Geography", format: "geojson", path: "dataset-2/bd-bazars.geojson", description: "Market and bazar point locations from OpenStreetMap." },
  { id: "major-routes", label: "Major Routes", group: "Geography", format: "geojson", path: "dataset-2/bd-major-routes.geojson", description: "Major national and regional road geometries." },
  { id: "imported-design", label: "Claude Design Export", group: "Imported Design", format: "json", path: "Website visual for dataset/Portrait of Bangladesh.dc.html", description: "The imported Claude Design visual reference used for this site's art direction." }
];

function abs(filePath) {
  return path.join(root, filePath);
}

function cleanBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === "\"" && quoted && next === "\"") {
      cell += "\"";
      i += 1;
      continue;
    }
    if (ch === "\"") {
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

async function readCsv(filePath) {
  const raw = cleanBom(await fs.readFile(abs(filePath), "utf8"));
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(abs(filePath), "utf8"));
}

function num(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b(upazila|upazilla|thana|sadar|city|metro|metropolitan|police|i c|u p o)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalDistrict(value) {
  const normalized = normalizeName(value);
  return districtAliases[normalized] ?? String(value ?? "").trim();
}

function canonicalThana(value) {
  const normalized = normalizeName(value);
  return thanaAliases[normalized] ?? String(value ?? "").trim();
}

function thanaKey(row) {
  return [
    normalizeName(row.Division),
    normalizeName(canonicalDistrict(row.District)),
    normalizeName(canonicalThana(row["Thana / Upazila"]))
  ].join("|");
}

function geoNameKey(name) {
  return normalizeName(canonicalThana(name));
}

function rowsFromJsonShape(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.features)) {
    return data.features.map((feature) => ({
      ...(feature.properties ?? {}),
      geometryType: feature.geometry?.type ?? null
    }));
  }
  const firstArray = Object.values(data).find(Array.isArray);
  if (firstArray) return firstArray;
  return Object.entries(data).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
}

function countBy(rows, key) {
  const counts = new Map();
  rows.forEach((row) => {
    const name = String(row[key] ?? "Unknown");
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Number(((count / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.count - a.count);
}

function indexByThana(rows) {
  return new Map(rows.map((row) => [thanaKey(row), row]));
}

async function getAuthoritativeThanaRows() {
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

function countMissingAdminIds(features) {
  return features.filter((feature) => {
    const props = feature.properties ?? {};
    return !props.division_id || !props.district_id || !props.upazila_id;
  }).length;
}

function countGeoMatchesToDataset1(features, referenceRows) {
  const dataset1Names = new Set(referenceRows.map((row) => normalizeName(canonicalThana(row["Thana / Upazila"]))));
  return features.filter((feature) => dataset1Names.has(geoNameKey(feature.properties?.name))).length;
}

async function getDatasetRows(dataset) {
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

async function buildDashboardData() {
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
    routesGeo,
    boundariesGeo
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
    readJson("dataset-2/bd-major-routes.geojson"),
    readJson("dataset-2/bangladesh.geojson")
  ]);
  const boundaryFeatures = boundariesGeo.features ?? [];
  const bazarFeatures = bazarsGeo.features ?? [];
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
  const priorityCounts = countBy(fmcgRows, "Distribution Priority").sort((a, b) => ["A", "B", "C"].indexOf(a.name) - ["A", "B", "C"].indexOf(b.name));
  const priorityBySegment = new Map();
  fmcgRows.forEach((row) => priorityBySegment.set(String(row["Consumer Profile Tag"]), String(row["Distribution Priority"])));

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
      bazarsMissingAdminIds: countMissingAdminIds(bazarFeatures),
      postcodesMissingDistrictId: postcodeRows.filter((row) => !row.district_id).length
    },
    divisions: divisionData,
    sectors: sectorRows
      .filter((row) => ["Agriculture", "Services", "Industry"].includes(String(row["Primary Sector"])))
      .map((row) => ({ name: String(row["Primary Sector"]), count: num(row["Thana Count"]), pct: num(row["% of Total"]) })),
    marketClass: countBy(economicRows, "Market Classification"),
    tradeClass: countBy(economicRows, "FMCG Trade Class"),
    priorities: priorityCounts,
    segments: countBy(fmcgRows, "Consumer Profile Tag").map((segment) => ({ ...segment, priority: priorityBySegment.get(segment.name) ?? "C" })),
    districtLeaders: {
      population: [...districtRows].sort((a, b) => num(b["Total Population"]) - num(a["Total Population"])).slice(0, 8),
      density: [...districtRows].sort((a, b) => num(b["Pop. Density (per sq km)"]) - num(a["Pop. Density (per sq km)"])).slice(0, 8),
      area: [...districtRows].sort((a, b) => num(b["Total Area (sq km)"]) - num(a["Total Area (sq km)"])).slice(0, 8)
    }
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data)}\n`);
}

async function main() {
  await fs.rm(publicDataDir, { recursive: true, force: true });
  await writeJson(path.join(publicDataDir, "dashboard.json"), await buildDashboardData());
  await writeJson(path.join(publicDataDir, "thanas.json"), {
    sourceOfTruth: "dataset-1",
    rows: await getAuthoritativeThanaRows()
  });

  await Promise.all(datasets.map(async (dataset) => {
    await writeJson(path.join(publicDataDir, "datasets", `${dataset.id}.json`), await getDatasetRows(dataset));
  }));

  await Promise.all(["bangladesh-boundaries", "bazars", "major-routes"].map(async (id) => {
    const dataset = datasets.find((item) => item.id === id);
    await writeJson(path.join(publicDataDir, "geo", `${id}.json`), {
      dataset,
      geojson: await readJson(dataset.path)
    });
  }));

  await fs.writeFile(path.join(root, "public", ".nojekyll"), "");
  console.log(`Generated static data in ${path.relative(root, publicDataDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
