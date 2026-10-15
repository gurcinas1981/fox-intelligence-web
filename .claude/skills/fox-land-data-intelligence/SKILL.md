---
name: fox-land-data-intelligence
description: Use whenever FOX tools ingest, analyse or present land, planning, GIS or property data, to record source, date, licence and confidence and keep Land IQ outputs defensible.
---

# FOX Land Data Intelligence

Every figure FOX shows a landowner, developer or council must be traceable to a source.

## 1. Source register (required for every dataset)

| Field | Example |
|---|---|
| source_name | HM Land Registry INSPIRE Index Polygons |
| publisher | HM Land Registry |
| url / api | … |
| retrieved_at | ISO date |
| data_date | date the data describes |
| licence | OGL v3 / OS OpenData / commercial |
| attribution_text | exact required wording |
| crs | EPSG:27700 |
| confidence | high / medium / low, with reason |

Store it in a `data_sources` table and link every derived record to its source id.

## 2. Preferred sources (official first)

- Boundaries and titles: HM Land Registry (INSPIRE polygons, Price Paid, CCOD/OCOD).
- Planning: planning.data.gov.uk datasets, local authority APIs or registers; adopted local plan documents.
- Constraints: Environment Agency flood zones, Natural England designations, Historic England listings and conservation areas, Green Belt, TPOs where published.
- Mapping: Ordnance Survey (respect OS licence terms), OS Open data products.
- Use scraping only where there is no feed or API and the site's terms permit it. Property portals such as Rightmove and Zoopla generally prohibit scraping; use licensed feeds or partner agreements for LandSearch.

## 3. Spatial rules

- Analyse in EPSG:27700; display in EPSG:4326.
- Validate geometries (no self-intersections, correct ring order) before analysis.
- Buffers and areas in metres and hectares; state both where useful.

## 4. Land IQ outputs

- Order: constraints → residual value → horizon scenarios (immediate, 3–5 years, 10-year strategic) → probability-weighted uplift.
- Output is a probability figure, not a valuation. Label it so on every screen and report.
- Show the inputs, assumptions and source dates behind each score.
- Flag any output intended for client reliance for review and sign-off by a chartered surveyor.

## 5. Freshness and failure

- Record when each dataset was last refreshed; warn in the UI when data is older than its expected update cycle.
- If a source is missing or fails, say so in the output. Never fill gaps with estimates presented as data.

## 6. Deliverable check

Before presenting results, confirm: every figure has a source id, licences and attributions are shown, CRS is correct, and confidence is stated.
