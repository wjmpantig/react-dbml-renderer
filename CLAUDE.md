# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (demo app)
npm run build        # TypeScript check + Vite library build
npm run lint         # Check with Biome
npm run lint:fix     # Lint and auto-fix with Biome
npm run preview      # Preview built output
```

There is no test suite in this project.

## Architecture

This is a React component library (`@wjmpantig/react-dbml-renderer`) that renders DBML (Database Markup Language) schemas as interactive diagrams. It's published to npm with both CJS and ESM builds.

**Data flow:**
1. Caller passes a DBML string to `<DbmlRenderer />`
2. `@dbml/core` parses it into a typed AST
3. `@dagrejs/dagre` calculates node positions (auto-layout)
4. `@xyflow/react` (React Flow) renders the interactive graph

**Component structure:**
- [src/DbmlRenderer.tsx](src/DbmlRenderer.tsx) — entry component; orchestrates parsing, dagre layout, and passes nodes/edges to React Flow
- [src/components/Table/](src/components/Table/) — React Flow node component for each database table
- [src/components/Field/](src/components/Field/) — renders each column within a table, hosts React Flow handles for edges
- [src/components/Relation/](src/components/Relation/) — visual handle component attached to fields for edge connections
- [src/contexts/DbmlRendererContext.ts](src/contexts/DbmlRendererContext.ts) — React context that shares table dimensions, animated edge state, and refs between components

**Layout calculation:** Table dimensions are measured on render (via context), then fed back into dagre to compute final node positions. This means layout depends on a render cycle.

**Edge animation:** When a field is hovered, the context stores the animated edge IDs so related fields highlight across the diagram.

## Tooling

- **Linter/Formatter:** Biome (not ESLint) — configured in [biome.json](biome.json) with tab indentation and double quotes
- **Styles:** SCSS modules (`*.module.scss`) for all components
- **Build:** Vite in library mode — outputs `dist/react-dbml-renderer.js` (ESM) and `dist/react-dbml-renderer.cjs` (CJS) with types in `dist/types/`
- **Path alias:** `@` maps to `src/`
- **Peer deps (not bundled):** `react`, `react-dom`, `@dbml/core`, `@xyflow/react`

## Example App

The [example/](example/) directory is a separate project that consumes the built library. To develop with it, build the library first then run the example separately.
