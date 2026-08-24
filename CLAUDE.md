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

**Tests:**

```bash
npm test             # Unit tests (vitest)
npm run test:e2e     # End-to-end tests (Playwright, drives the root dev demo)
```

Unit tests live in [src/utils/layout.test.ts](src/utils/layout.test.ts); the
Playwright specs in [e2e/](e2e/). `npm run test:e2e` starts its own dev server on
port 5175, so it will not collide with one you already have running.

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
- [src/components/Relation/](src/components/Relation/) — visual handle component attached to fields for edge connections; the cardinality (`1`, `0..1`, `*`, `0..*`) is rendered by CSS off `attr(data-cardinality)`
- [src/components/TableGroup/](src/components/TableGroup/) — backdrop node for a DBML `TableGroup`; members become React Flow child nodes via `parentId`
- [src/components/StickyNote/](src/components/StickyNote/) — top-level `Note` blocks
- [src/components/EnumNode/](src/components/EnumNode/) — `Enum` blocks, so an enum no column uses is still visible
- [src/contexts/DbmlRendererContext.ts](src/contexts/DbmlRendererContext.ts) — React context that shares table dimensions, animated edge state, and refs between components

**Layout calculation:** Table dimensions are measured on render (via context), then fed back into dagre to compute final node positions. This means layout depends on a render cycle. Before the first measurement `estimateRows` in [src/utils/layout.ts](src/utils/layout.ts) stands in — it must track whatever `Table` actually draws (header, fields, index/check sections) or the first paint overlaps.

**Table groups** are not part of the dagre graph: tables are laid out normally, then each group becomes a parent node sized to its members' bounding box.

**Edge animation:** When a field is hovered, the context stores the animated edge IDs so related fields highlight across the diagram.

## Tooling

- **Linter/Formatter:** Biome (not ESLint) — configured in [biome.json](biome.json) with tab indentation and double quotes
- **Styles:** SCSS modules (`*.module.scss`) for all components
- **Build:** Vite in library mode — outputs `dist/react-dbml-renderer.js` (ESM) and `dist/react-dbml-renderer.cjs` (CJS) with types in `dist/types/`
- **Path alias:** `@` maps to `src/`
- **Peer deps (not bundled):** `react`, `react-dom`, `@dbml/core`, `@xyflow/react`
- **`@dbml/core` v10+ only.** Its `exports` map exposes just `"."`, so model types
  come from the package root (`import type { Table } from "@dbml/core"`); the old
  `@dbml/core/types/model_structure/*` deep paths no longer resolve.

## Example App

The [example/](example/) directory is a separate project that consumes the built library. To develop with it, build the library first then run the example separately.
