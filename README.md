# FOX Land IQ — Planning & Development Appraisal

FOX Land IQ is an evidence-led preliminary land appraisal tool for England.

## What the MVP does

1. Accepts a site address/postcode plus optional site area, current use, planning reference and notes.
2. Resolves a supplied UK postcode using Postcodes.io.
3. Runs an open-data planning pre-screen using Planning Data for core datasets including conservation areas, listed buildings, Green Belt, flood-risk zones, Article 4 areas, TPO zones and brownfield land.
4. Sends the evidence into the OpenAI Responses API with live web search and high reasoning.
5. Requires the AI to verify current national policy, adopted/emerging local policy, planning history, nearby precedents and other material constraints.
6. Produces 3–5 plausible development options with FOX Development Suitability scores.
7. Separately tests planning consent routes such as Full, Outline, PiP and Prior Approval for eligibility before scoring them.
8. Returns a RAG constraint matrix, risk register, data gaps, planning strategies and evidence sources.
9. Allows browser print/PDF and JSON export.

## Important

FOX scores are planning-suitability indicators. They are not probabilities of planning approval and are not formal valuations.

The product is a preliminary professional-style desktop appraisal. Parcel boundaries, title, access rights, measured surveys, engineering, environmental surveys and formal valuation require separate verification where material.

## Local setup

Create a .env.local file:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-terra
```

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deployment

Import this repository into Vercel or another Next.js-compatible host and add the same two environment variables securely on the host.

Do not put the OpenAI API key in client-side code or commit it to GitHub.

## Current MVP data sources

- Postcodes.io — postcode geocoding and administrative context
- Planning Data — structured planning constraints
- OpenAI Responses API Web Search — current national/local policy, planning history, precedents and corroborating research

## Next development stages

- Parcel boundary / polygon input
- Planning application API/connectors by LPA
- Environment Agency and Natural England dedicated screens
- Coal/mining and geological data
- Land Registry and market comparables
- Development appraisal / residual land value
- Project accounts and saved appraisals
- PDF report generator
- FOX Atlas integration
- ChatGPT plugin / remote MCP surface
