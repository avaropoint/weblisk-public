# Weblisk Public Website

The official Weblisk documentation and marketing website.

## Structure

```
weblisk-public/
├── index.html              Landing page
├── features.html           Feature overview
├── pro.html                Pro tier page
├── dashboard.html          Dashboard demo
├── settings.html           Settings demo
├── 404.html                Error page
├── sw.js                   Service worker
├── css/
│   └── styles.css          Stylesheet
├── js/
│   ├── config.js           Runtime config
│   ├── state.js            State management
│   └── islands/            Island components
├── docs/                   Documentation pages
│   ├── index.html
│   ├── quick-start.html
│   ├── installation.html
│   ├── project-structure.html
│   ├── routing.html
│   ├── signals.html
│   ├── islands.html
│   ├── components.html
│   └── ...
├── features/               Feature detail pages
│   ├── core.html
│   ├── state.html
│   ├── performance.html
│   └── ...
└── images/                 Static assets
```

## Development

Serve locally with any static file server:

```bash
# With weblisk CLI
weblisk dev

# Or with Python
python3 -m http.server 3000

# Or with npx
npx serve .
```

## Deployment

Deploy to any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages).

The site uses CDN imports for the Weblisk framework:
```
https://cdn.weblisk.dev/v1/
```

## License

MIT
