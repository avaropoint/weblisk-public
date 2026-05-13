# Blueprint Planning — Platform, Marketplace, Docs
# These are future page blueprints to be implemented after homepage stabilizes.
# Each entry describes the page purpose, key sections, and source material.

## Platform Pages (/platform/)

### /platform/ — Platform Overview
- **Purpose**: Entry point for the Weblisk platform. Shows what you get.
- **Sections**: Hero, architecture overview (interactive diagram from homepage reused), generation targets (Go/Rust/Node/CF Workers), agent catalog overview, federation overview, CTA to docs.
- **Source material**: Architecture section from homepage, v1/features/ pages for structure inspiration.
- **Priority**: HIGH — this is the primary CTA target from the homepage.

### /platform/blueprints/ — Blueprint Catalog
- **Purpose**: Explore all 97+ specifications organized by category.
- **Sections**: Category filter (protocol/architecture/agents/patterns/platforms/schemas/standards), spec cards with metadata, search, individual spec detail pages.
- **Source material**: Actual spec files from weblisk-blueprints repo.
- **Priority**: HIGH — referenced from architecture layers.

### /platform/agents/ — Agent Catalog
- **Purpose**: Explore the 11+ infrastructure agents and domain agent capabilities.
- **Sections**: Agent list, capability descriptions, sandboxing model, AI integration.
- **Source material**: agents/ category from weblisk-blueprints.
- **Priority**: MEDIUM.

### /platform/client/ — Client Framework
- **Purpose**: The Weblisk client-side JavaScript framework documentation hub.
- **Sections**: Overview, island architecture, hydration strategies, signals, components, routing.
- **Source material**: v1/docs/ client-side JS files (19 files worth preserving — see audit).
- **Priority**: MEDIUM — linked from pipeline callout.

---

## Marketplace Pages (/marketplace/)

### /marketplace/ — Marketplace Hub
- **Purpose**: Browse, search, and discover community blueprints, agents, and templates.
- **Sections**: Hero, featured blueprints, categories (patterns, agents, templates, starters), search, community stats, how to publish.
- **Source material**: New design, no v1 equivalent worth keeping.
- **Priority**: MEDIUM — referenced from CTA and footer.

### /marketplace/publish — Publishing Guide
- **Purpose**: How to create and publish blueprints to the marketplace.
- **Sections**: Requirements, validation process, 5 compliance tiers, pricing model, community guidelines.
- **Source material**: schemas/ and standards/ specs from weblisk-blueprints.
- **Priority**: LOW.

---

## Documentation Pages (/docs/)

### /docs/ — Docs Hub (rebuild from v1)
- **Purpose**: Main documentation entry point.
- **Sections**: Getting started path, concept guides, API reference, tutorials, migration guides.
- **Source material**: v1/docs/index.html for structure, content needs rewriting.
- **Priority**: HIGH.

### /docs/quickstart.html (rebuild from v1)
- **Purpose**: 5-minute quick start guide.
- **Sections**: Install, init, generate, run, deploy.
- **Source material**: v1/docs/quickstart.html, getting-started section from homepage.
- **Priority**: HIGH — primary docs CTA target.

### /docs/installation.html (rebuild from v1)
- **Purpose**: Detailed installation guide.
- **Source material**: v1/docs/installation.html.
- **Priority**: HIGH.

### Client Framework Docs (migrate from v1)
These 19 pages should be migrated from v1/docs/ with updated styling:
- islands.html, hydration.html, signals.html, state.html, store.html
- components.html, ui.html, routing.html, transitions.html
- fetch.html, realtime.html, workers.html, scheduler.html
- security.html, performance.html, a11y.html, pwa.html
- testing.html, analytics.html, devtools.html
- **Priority**: MEDIUM — valuable content already written.

### New Docs (no v1 equivalent)
- /docs/blueprints.html — How blueprints work (concepts)
- /docs/agents.html — Agent system overview
- /docs/governance.html — AI governance model
- /docs/federation.html — Federation and hub networks
- /docs/migrations.html — Data migration and upgrades
- **Priority**: MEDIUM-HIGH — unique to the framework.

---

## Implementation Order
1. /platform/ (HIGH) — needed for homepage "See It In Action" CTA
2. /docs/ + /docs/quickstart.html (HIGH) — needed for "Start Building" CTA
3. /docs/installation.html (HIGH) — dependency for quick-start
4. /platform/blueprints/ (HIGH) — architecture layer links
5. Client framework docs migration (MEDIUM) — 19 pages from v1
6. /marketplace/ (MEDIUM) — footer + CTA links
7. New concept docs (MEDIUM-HIGH) — governance, federation, etc.
8. /platform/agents/ + /platform/client/ (MEDIUM) — secondary reference
9. /marketplace/publish (LOW) — community feature
