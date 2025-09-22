# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack (opens at http://localhost:3000)
- `npm run build` - Build production app with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint on the codebase

## Project Architecture

This is a Next.js 15.5.3 application using the App Router architecture with TypeScript and Tailwind CSS v4.

### Key Technologies
- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript 5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Build**: Turbopack for both dev and production builds
- **Linting**: ESLint with Next.js core-web-vitals and TypeScript configurations

### Directory Structure
```
src/
  app/                 # App Router directory
    layout.tsx         # Root layout with font setup and global metadata
    page.tsx           # Home page component
    globals.css        # Global styles with Tailwind imports and custom CSS variables
```

### Styling System
- Uses Tailwind CSS v4 with custom theme configuration via `@theme inline` in globals.css
- CSS custom properties for theming (supports light/dark mode)
- Font variables configured in layout.tsx and referenced in CSS

### TypeScript Configuration
- Path mapping: `@/*` points to `./src/*`
- Next.js plugin enabled for enhanced TypeScript support
- Strict mode enabled with noEmit for type checking only

### ESLint Configuration
- Extends Next.js core-web-vitals and TypeScript rules
- Ignores build directories (.next, out, build) and node_modules