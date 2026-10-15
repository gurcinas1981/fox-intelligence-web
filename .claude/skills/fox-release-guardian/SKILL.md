---
name: fox-release-guardian
description: Use before merging, deploying, migrating a database or changing permissions on any FOX site or service, to run checks and keep production changes approved and reversible.
---

# FOX Release Guardian

No FOX change reaches production without evidence and approval.

## Hard rules

1. Never deploy to production, apply a production migration, change DNS, or alter access permissions without Tomas's explicit approval in the current conversation.
2. Every production change must have a written rollback path before it ships.
3. "It should work" is not evidence. Show test output, screenshots or logs.

## Release chain

GitHub branch → checks below → Vercel preview + Supabase branch → Tomas approves → production → status logged to Nexus (nexus.foxintelligence.co.uk) and shown in ORBIT (ecosystem.foxintelligence.co.uk).

## Checks (run all that apply; report pass/fail with evidence)

### Code and build
- Build passes with no new warnings that matter.
- Lint and type checks pass.
- Tests pass; new behaviour has a test.

### Interface
- Works at 375px, 768px and 1440px widths; no horizontal scroll.
- Key journeys work end to end (navigation, forms, map load, login where present).
- Brand tokens and fonts match fox-ecosystem-architect.

### Security
- No secrets in code, commits or client bundles.
- Supabase: Row Level Security enabled on every table exposed to the client; run the Supabase advisors and resolve security findings.
- New endpoints validate input and require auth where appropriate.
- New third-party packages reviewed for maintenance and licence.

### Data
- Migrations tested on a Supabase branch first; reversible or backed up.
- No destructive change (drop, truncate, column removal) without a backup and explicit approval.

### Search and content
- Titles, meta descriptions and canonical URLs set; correct domain (foxatlas.co.uk is canonical UK for Atlas; foxintelligence.co.uk for the parent brand).
- No broken links on changed pages.

## Release note (deliver every time)

```
Release: <product> — <change>
Preview: <url>
Checks: build ✔ | tests ✔ | mobile ✔ | security ✔ | data ✔ | SEO ✔
Risks: <list or none>
Rollback: <exact steps>
Awaiting approval: yes/no
```
