import type { DataRow } from "./data";

export const districtAliases: Record<string, string> = {
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

export const thanaAliases: Record<string, string> = {
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
  "daganbhyan": "Daganbhuiyan",
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

export function normalizeName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b(upazila|upazilla|thana|sadar|city|metro|metropolitan|police|i c|u p o)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalDistrict(value: unknown) {
  const normalized = normalizeName(value);
  return districtAliases[normalized] ?? String(value ?? "").trim();
}

export function canonicalThana(value: unknown) {
  const normalized = normalizeName(value);
  return thanaAliases[normalized] ?? String(value ?? "").trim();
}

export function thanaKey(row: DataRow) {
  return [
    normalizeName(row.Division),
    normalizeName(canonicalDistrict(row.District)),
    normalizeName(canonicalThana(row["Thana / Upazila"]))
  ].join("|");
}

export function geoNameKey(name: unknown) {
  return normalizeName(canonicalThana(name));
}
