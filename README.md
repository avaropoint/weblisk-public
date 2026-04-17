# Weblisk Public Website

The official website for [Weblisk](https://weblisk.dev) — the zero-dependency web platform, from browser to federated agent intelligence.

Built by [Avaropoint](https://avaropoint.com).

## Structure

```
weblisk-public/
├── index.html                  Landing page
├── features.html               Feature overview
├── pro.html                    Pro tier
├── dashboard.html              Dashboard demo
├── settings.html               Settings demo
├── 404.html                    Error page
├── sw.js                       Service worker
├── sitemap.xml                 Sitemap (58 pages)
├── robots.txt                  Crawler directives
├── manifest.webmanifest        PWA manifest
├── css/
│   └── styles.css              Stylesheet
├── js/
│   ├── config.js               Runtime config & routes
│   ├── state.js                Reactive state (signals)
│   └── islands/                Island components
├── images/                     Static assets & brand PNGs
├── docs/                       Client framework documentation
│   ├── index.html              Docs home
│   ├── quick-start.html        Quick start guide
│   ├── installation.html       CLI installation
│   ├── project-structure.html  Project layout
│   ├── signals.html            Reactive signals
│   ├── islands.html            Islands architecture
│   ├── hydration.html          Hydration strategies
│   ├── components.html         Components
│   ├── state.html              State management
│   ├── store.html              Store module
│   ├── routing.html            Client-side routing
│   ├── fetch.html              Data fetching
│   ├── realtime.html           WebSocket & SSE
│   ├── security.html           Security features
│   ├── a11y.html               Accessibility
│   ├── performance.html        Performance
│   ├── pwa.html                Progressive Web App
│   ├── transitions.html        View transitions
│   ├── scheduler.html          Task scheduler
│   ├── workers.html            Web Workers
│   ├── testing.html            Testing
│   ├── cli.html                CLI reference
│   ├── devtools.html           DevTools
│   ├── analytics.html          Analytics
│   ├── ui.html                 UI utilities
│   └── integration.html        Third-party integration
├── features/                   Interactive feature demos
│   ├── core.html               Core framework
│   ├── state.html              State management
│   ├── networking.html         Networking
│   ├── security.html           Security
│   ├── a11y.html               Accessibility
│   ├── performance.html        Performance
│   ├── pwa.html                PWA
│   ├── data.html               Data handling
│   ├── pro.html                Pro features
│   ├── transitions.html        View transitions
│   ├── routing.html            Routing
│   └── components.html         Components
├── server/                     Server framework
│   ├── index.html              Server overview
│   ├── specification.html      Protocol specification
│   ├── protocols.html          Communication protocols
│   ├── implementations.html    Language implementations
│   ├── go.html                 Go reference implementation
│   ├── hub.html                Hub network & federation
│   └── comparison.html         vs LangChain, CrewAI, AutoGen, etc.
├── blueprints/                 Deployment blueprints
│   ├── index.html              Blueprints overview
│   ├── catalog.html            Blueprint catalog
│   └── authoring.html          Authoring guide
└── agents/                     Autonomous agents
    ├── index.html              Agents overview
    ├── catalog.html            Agent catalog
    ├── building.html           Building agents
    └── protocols.html          Agent protocols
```

## Development

Serve locally with any static file server:

```bash
weblisk dev

# Or with Python
python3 -m http.server 3000

# Or with npx
npx serve .
```

## Deployment

Deployed to Cloudflare R2 via GitHub Actions. The Cloudflare Worker at `workers/site.js` serves pages with security headers, CSP, and MIME types.

The site uses CDN imports for the Weblisk framework:

```
https://cdn.weblisk.dev/
```

## License

MIT
