# Bangladesh Dataset Mismatch Report

Generated from `dataset-1` and `dataset-2`.

## Implementation Decision

`dataset-1` is now treated as the source of truth for all thana/upazila records in the Next.js app.

- The default raw explorer dataset is `Authoritative Thana Profiles`.
- `/api/thanas` returns the normalized 554-row thana table from `dataset-1`.
- `dataset-2` is treated as supporting geography only: map boundaries, bazars, routes, postcodes, and coordinate references.
- Name differences from `dataset-2` should be mapped back to `dataset-1` through aliases before joining.

## Clean Checks

- `dataset-1/thana_reference.csv`, `thana_economic_activity.csv`, and `thana_fmcg_consumer_profile.csv` each contain 554 records.
- The 554 `(Division, District, Thana / Upazila)` keys match exactly across those three CSV files.
- No duplicate thana keys were found in those three CSV files.
- `summary_division.csv` matches `thana_reference.csv` totals for thana count, population, and area by division.
- Division names match between `dataset-1` and `dataset-2`: Barishal, Chattogram, Dhaka, Khulna, Mymensingh, Rajshahi, Rangpur, Sylhet.

## Important Mismatches

### 1. Different Granularity

`dataset-1` is thana-focused; `dataset-2` is mostly geographic upazila/admin focused.

- `dataset-1` thana records: 554
- `dataset-2/bd-upazilas.json`: 494
- `dataset-2/bangladesh.geojson`: 544 features

`dataset-1` includes 66 city thana style records:

- Dhaka: 40
- Chattogram: 15
- Khulna: 5
- Rajshahi: 4
- Barishal: 2

This explains many thana/upazila mismatches. These are not all errors; they are different administrative levels.

### 2. District Spelling / Naming Differences

Six district names differ between the folders:

| dataset-1 | dataset-2 |
|---|---|
| Chapai Nawabganj | Nawabganj |
| Comilla | Cumilla |
| Jessore | Jashore |
| Khagrachhari | Khagrachari |
| Moulvibazar | Maulvibazar |
| Sirajganj | Sirajgonj |

These should be handled with an alias table before joining datasets.

### 3. GeoJSON Missing Admin IDs

`dataset-2/bangladesh.geojson` has 544 boundary features.

- 118 features have blank `division_id`, `district_id`, and/or `upazila_id`.
- Examples include: Adabor, Badda, Bangshal, Gulshan, Anowara, Baghai Chhari, Bakalia, Boalia, Cantonment, Chak Bazar, Chittagong Port.

These features can render on the map, but cannot be reliably joined to division/district/upazila tables without name-based matching or manual mapping.

### 4. Bazar GeoJSON Missing Admin IDs

`dataset-2/bd-bazars.geojson` has 3,478 features.

- 838 features have blank admin IDs.
- Many are market/shop names without linked upazila/district/division metadata.

These can be shown as points, but filtering them by division/district will be incomplete unless they are spatially joined to boundaries.

### 5. Postcode Schema Problem

`dataset-2/bd-postcodes.json` has 1,349 postcode records.

12 records for `Chapinawabganj` are missing `district_id`. They use a `district` text field instead.

Affected postcodes:

- 6330 Bholahat
- 6303 Amnura
- 6300 Chapinawbganj Sadar
- 6301 Rajarampur
- 6302 Ramchandrapur
- 6311 Mandumala
- 6310 Nachol
- 6321 Gomashtapur
- 6320 Rohanpur
- 6341 Kansart
- 6342 Manaksha
- 6340 Shibganj U.P.O

### 6. `summary_sector.csv` Contains Three Tables

`dataset-1/summary_sector.csv` is not one simple CSV table. It contains:

- Primary Sector
- FMCG Trade Class
- Market Classification

A generic CSV parser reads the later section headers as rows. The website data layer should parse this file as three mini-tables or use the detailed thana files to compute these summaries.

## Recommended Fixes

1. Add a district alias table for renamed/spelling variants.
2. Add a thana/upazila alias table for spelling variants such as `Abhaynagor` vs `Abhaynagar`, `Comilla` vs `Cumilla`, `Hatiya` vs `Hatia`, etc.
3. Treat city thanas as a separate admin layer from upazilas.
4. Backfill missing admin IDs in `bangladesh.geojson` by matching names and/or spatial containment.
5. Spatially join `bd-bazars.geojson` points to boundary polygons to fill missing division/district/upazila fields.
6. Normalize `bd-postcodes.json` so every record has `district_id`.
7. Split `summary_sector.csv` into three clean CSV files, or compute those summaries from `thana_economic_activity.csv`.
