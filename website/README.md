# Sentinel Website

The landing page and documentation site for Sentinel, built with [Next.js](https://nextjs.org) 16 and TailwindCSS 4.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Structure

```
src/
├── app/
│   ├── page.js          # Landing page
│   ├── docs/page.js     # Documentation page
│   ├── layout.js        # Root layout + SEO metadata
│   └── globals.css      # Theme, utilities, animations
├── components/
│   ├── Header.jsx       # Navigation header
│   ├── Footer.jsx       # Site footer
│   ├── AgentCard.jsx    # Agent display card
│   ├── TerminalTyper.jsx # Terminal typing animation
│   └── TypewriterText.jsx
└── utils/
    └── osHelpers.js     # OS icon/color mapping
```

## Building for Production

```bash
npm run build
```

The site is fully static — all pages are pre-rendered at build time.
