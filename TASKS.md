# Tasks

## Bugs — do these first

- [x] **Layout ignores measured table sizes.** [DbmlRenderer.tsx:189-202](src/DbmlRenderer.tsx#L189-L202) — the layout effect deps are all stable, so `setTable` never triggers a re-layout. Every diagram uses the fallback estimate `172 × 36*(fields+1)`. Add `tableSizes` to the deps; guard so layout runs once all tables have reported, not once per measurement.
- [x] **dagre centers vs React Flow top-left.** [DbmlRenderer.tsx:150-153](src/DbmlRenderer.tsx#L150-L153) — `dagre.layout` returns node centers; React Flow `position` is top-left. Subtract `width/2` / `height/2`. Re-tune `nodesep`/`ranksep` only after this and the task above land.
- [x] ~~**Parse errors render on one line.**~~ Not a bug: `.error` already sets `white-space: pre-wrap` and the inner div inherits it. Verified in the browser — diagnostics render one per line.
- [x] **Stale closure on field hover.** [Field.tsx:74-80](src/components/Field/Field.tsx#L74-L80) — effect deps are `[hovered]` but it closes over `connectedEdges`. If edges change mid-hover, `removeAnimatedEdges` runs with the old list and the animation sticks.

- [x] **Viewport did not follow the re-layout.** Fell out of the first fix: the initial `fitView` ran against the estimated layout. `FitOnLayout` refits once per layout pass (not on drags).

## Performance

- [x] **Hover re-renders the whole graph.** `setAnimatedEdges` → `setEdges` rebuilds every edge object ([DbmlRenderer.tsx:204-215](src/DbmlRenderer.tsx#L204-L215)) → `useEdges()` returns a new array in every `Field` → each field re-filters all edges ([Field.tsx:41-44](src/components/Field/Field.tsx#L41-L44)) and its `highlighted` memo is defeated by the fresh array identity.
  - [x] `animatedEdgeIds` is a `Set<string>`; add/remove keep the same Set when nothing changed.
  - [x] The edge-rebuilding effect only allocates new objects for edges whose animated state flipped.
  - [x] The layout pass resolves `tableId → fieldId → handles` once and passes it through node data; no field calls `useEdges()`.

## Delete

- [x] `src/components/Property/` — `const Property = () => {}`, returns undefined, crashes if rendered.
- [x] `src/components/Schema/` — unused; renders `<div>` tables inside an `<svg>`.
- [ ] ~~`src/App.tsx`, `src/App.css`, `src/main.tsx`, `src/index.css`~~ — **kept deliberately.** The two demos do different jobs: the root one is what `npm run dev` serves against the source, [example/](example/) is the packaged-consumer test (yalc). Deleting the root one would make every dev loop go through a build.
- [x] `typescript-eslint` + `globals` from devDeps — the project uses Biome.
- [x] `"./*": "./dist/*"` from package.json `exports` — leaks every internal file as public API.
- [x] Commented-out code: [Field.tsx:22-23,73](src/components/Field/Field.tsx#L22-L23), [Relation.tsx:22](src/components/Relation/Relation.tsx#L22), [Table.tsx:25-28](src/components/Table/Table.tsx#L25-L28); `console.error` at [DbmlRenderer.tsx:166](src/DbmlRenderer.tsx#L166).
- [x] Dropped `react-icons` as a runtime dependency — four inline SVGs in [src/components/icons.tsx](src/components/icons.tsx). It stays a devDependency for the demo. ESM bundle 85.6 kB → 81.6 kB.

## Polish

- [x] **Measure with `ResizeObserver`.** [Table.tsx:31-38](src/components/Table/Table.tsx#L31-L38) measures once on mount with `clientHeight` (excludes border). An observer is the native answer and survives font loading.
- [x] **Keyboard access to field details.** [Field.tsx:88](src/components/Field/Field.tsx#L88) is a `<button>` with no `onClick` and a hover-only detail panel. Add `onFocus`/`onBlur` next to the mouse handlers.
- [x] **Handles nested inside the button** — nested interactive elements. Move `{handles}` out of the `<button>`.
- [x] **Unify the DBML types.** [types.d.ts](src/types.d.ts) derives from `ReturnType<Parser["parse"]>` (instance type) while the code calls `Parser.parse` statically, and [DbmlRenderer.tsx:3](src/DbmlRenderer.tsx#L3) imports `Database` directly. Pick one source.
- [x] **`rollup-plugin-visualizer` writes `stats.html` on every build** — gate it behind an env flag. Now `ANALYZE=1 npm run build`.

## Project hygiene

- [x] Smoke tests: [src/utils/layout.test.ts](src/utils/layout.test.ts) covers node/edge creation, handle sides, top-left conversion, and measured sizes driving the layout. `npm test` (vitest).
- [ ] Hover/highlight still has no unit test — it needs jsdom + a React Flow provider. Covered by Playwright for now; add RTL if it regresses.
- [x] CI: [.github/workflows/ci.yml](.github/workflows/ci.yml) runs lint, tests and build on push and PRs.
- [x] `prepublishOnly` runs the same three checks so `dist` can't go stale on publish.
- [x] ~~Update [CLAUDE.md](CLAUDE.md)~~ — the described measure-then-layout loop is now real.

## Notes

Biome no longer lints `example/` — it is a separate project with its own
ESLint config, and its formatting differences were the bulk of the lint noise.
