---
name: fox-ecosystem-architect
description: Use when designing, building or changing any FOX Intelligence product, site, subdomain or shared service, to keep architecture, naming, brand and interfaces consistent across the ecosystem.
---

# FOX Ecosystem Architect

The single source of truth for how FOX products fit together. Read this before starting work on any FOX repository, site or service.

## 1. Ecosystem map

| Layer | Product | Repo | Vercel project | Production domain | Role |
|---|---|---|---|---|---|
| Orchestration | FOX Nexus | gurcinas1981/nexus | fox-nexus | nexus.foxintelligence.co.uk | Own n8n-style agent/workflow control platform: register, connect, reconnect, delete agents and plugins; run logs; approvals |
| Interface | FOX ORBIT | gurcinas1981/fox-orbit | fox-orbit | ecosystem.foxintelligence.co.uk | Visual ecosystem dashboard and status view fed by Nexus |
| Intelligence | Land IQ | gurcinas1981/landiq | landiq | landiq.foxintelligence.co.uk | Site constraint analysis → residual value → horizon scenarios → probability output |
| Discovery | LandSearch | gurcinas1981/landsearch | landsearch | land.foxatlas.co.uk | Land-for-sale listing search against preset filters; PC and phone app |
| Monitoring | Planning Radar | gurcinas1981/fox-planning-radar (gurcinas1981/radar is empty) | fox-planning-radar | radar.foxintelligence.co.uk | Policy, consultation and application monitoring |
| Identity | Land Passport Digital Twin | gurcinas1981/land-passport | land-passport (+ land-passport-derby) | landpassport.foxintelligence.co.uk | Smart BIM model in a live 3D map context; updates on policy/site/scenario change |
| Presentation | FOX Atlas / FOX Design | gurcinas1981/FOX-ATLAS | fox-atlas | foxatlas.co.uk, fox-atlas.com, projectname.foxatlas.co.uk | Digital Land ID microsites, masterplans, marketing |
| Corporate | FOX Intelligence | gurcinas1981/foxintelligence-site (fox-intelligence-web is older) | fox-intelligence | foxintelligence.co.uk | Parent brand |

Client microsites (stoneleigh-farm, netherhousemews, rose-cottage-fold, vantage, nuncargate-collection) sit under FOX Atlas.

Vercel team: Fox (slug `foxatlas`). Brand architecture: "Fox Atlas — powered by FOX Intelligence". Never invent a new product name, subdomain or brand line without asking Tomas.

## 2. Before writing code

1. Identify which product above the work belongs to. If none fits, stop and ask.
2. State the interfaces touched: database tables, APIs, Nexus workflows, shared components.
3. Check whether a shared module already exists before creating a new one.
4. Record any new dependency between products in the repository's ARCHITECTURE.md.

## 3. Shared standards

- **Stack defaults:** React/Next.js on Vercel; Supabase (Postgres + PostGIS) for data; GitHub for source. Deviate only with a written reason.
- **Spatial:** store geometry in EPSG:27700 (British National Grid) for analysis; transform to EPSG:4326 only for web maps.
- **Data provenance:** every external dataset follows the fox-land-data-intelligence skill.
- **Releases:** every production change follows the fox-release-guardian skill.
- **Secrets:** environment variables only; never in code, prompts or logs.

## 4. Brand tokens

- Heritage Green (primary), Fox Russet (accent), Antique Gold #C8A96A (premium detail), Parchment #F7F6F1 (background), White, Charcoal (body text). Dark product UI background rgb(10,15,13).
- Product UI: Inter Bold/Light. Editorial/marketing: Cormorant Garamond or EB Garamond.
- British English throughout.

## 5. Language rules

- Land IQ outputs are probability figures, never valuations. Copy must not imply a RICS valuation unless a chartered surveyor has signed it.
- FOX Design is positioned as digital land storytelling, not agency or promotion.

## 6. Output

Finish each architectural change with a short note: product affected, interfaces changed, new dependencies, and open questions for Tomas.
