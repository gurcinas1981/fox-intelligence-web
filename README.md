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
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

CI runs these checks on Linux and Windows for every pull request and main push.
The offline tests cover input validation, missing server configuration, mocked evidence/AI responses, score recalculation, lookup failure disclosure, invalid AI output and prompt context. They require no API keys or paid requests. Live AI quality and deployment behaviour need separate verification.

## Deployment

Import this repository into Vercel or another Next.js-compatible host and add the environment variables from `.env.example` securely on the host.

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

## Paid endpoint access and request limits

`POST /api/analyse` requires `Authorization: Bearer <APPRAISAL_ACCESS_TOKEN>`.
Set a random server-only access code of at least 32 characters. The browser asks
for this code and keeps it only in component memory; it is never put in URLs or
persistent browser storage. This is private operator access, not individual user
accounts, subscriptions or billing. Rotate the code if it is disclosed.

Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for a dedicated
Upstash-compatible Redis REST database. An atomic Lua reservation caps the whole
service at 3 attempts per UTC-aligned 10-minute window and 20 per UTC day, shared
across instances and callers. Limits do not depend on spoofable client IP headers.
Failed provider attempts still count. Fixed windows can allow adjacent-window
bursts; these are request caps, not a currency spending guarantee. OpenAI automatic
retries are disabled. Use provider budget controls separately.

Missing access or Redis configuration, Redis errors and timeouts disable paid
requests (503); incorrect codes return 401; exhausted limits return 429 with
Retry-After. Authorization runs before body parsing and all network activity;
validated requests reserve quota before evidence gathering or AI calls.

Before activating, configure these secrets privately for the intended environment,
use separate Redis databases/access codes for preview and production, and verify
Vercel Deployment Protection for both preview and production URLs in project
settings. Platform protection is an additional layer; it does not replace endpoint
authorization. Never expose these secrets through NEXT_PUBLIC_ variables or Git.
No production credentials or deployment settings are changed by this PR.
