# Tasks

## Bugs — do these first

- [ ] **Layout ignores measured table sizes.** [DbmlRenderer.tsx:189-202](src/DbmlRenderer.tsx#L189-L202) — the layout effect deps are all stable, so `setTable` never triggers a re-layout. Every diagram uses the fallback estimate `172 × 36*(fields+1)`. Add `tableSizes` to the deps; guard so layout runs once all tables have reported, not once per measurement.
- [ ] **dagre centers vs React Flow top-left.** [DbmlRenderer.tsx:150-153](src/DbmlRenderer.tsx#L150-L153) — `dagre.layout` returns node centers; React Flow `position` is top-left. Subtract `width/2` / `height/2`. Re-tune `nodesep`/`ranksep` only after this and the task above land.
- [ ] **Parse errors render on one line.** [DbmlRenderer.tsx:252-259](src/DbmlRenderer.tsx#L252-L259) — diagnostics are joined with `\n` into a `<div>`. Add `white-space: pre-wrap` to `.error`.
- [ ] **Stale closure on field hover.** [Field.tsx:74-80](src/components/Field/Field.tsx#L74-L80) — effect deps are `[hovered]` but it closes over `connectedEdges`. If edges change mid-hover, `removeAnimatedEdges` runs with the old list and the animation sticks.

## Performance

- [ ] **Hover re-renders the whole graph.** `setAnimatedEdges` → `setEdges` rebuilds every edge object ([DbmlRenderer.tsx:204-215](src/DbmlRenderer.tsx#L204-L215)) → `useEdges()` returns a new array in every `Field` → each field re-filters all edges ([Field.tsx:41-44](src/components/Field/Field.tsx#L41-L44)) and its `highlighted` memo is defeated by the fresh array identity.
  - Store `animatedEdges` as `Set<string>` of ids (ids are all that's ever used).
  - Drop the edge-rebuilding effect; let each `Field` read set membership.
  - Precompute a `fieldId → edges` map at node-creation time instead of filtering per field.

## Delete

- [ ] `src/components/Property/` — `const Property = () => {}`, returns undefined, crashes if rendered.
- [ ] `src/components/Schema/` — unused; renders `<div>` tables inside an `<svg>`.
- [ ] `src/App.tsx`, `src/App.css`, `src/main.tsx`, `src/index.css` — second demo app inside `src/` while [example/](example/) exists. Keep one.
- [ ] `typescript-eslint` + `globals` from devDeps — the project uses Biome.
- [ ] `"./*": "./dist/*"` from package.json `exports` — leaks every internal file as public API.
- [ ] Commented-out code: [Field.tsx:22-23,73](src/components/Field/Field.tsx#L22-L23), [Relation.tsx:22](src/components/Relation/Relation.tsx#L22), [Table.tsx:25-28](src/components/Table/Table.tsx#L25-L28); `console.error` at [DbmlRenderer.tsx:166](src/DbmlRenderer.tsx#L166).
- [ ] Consider dropping `react-icons` — a full dependency for four glyphs. Inline the SVG paths.

## Polish

- [ ] **Measure with `ResizeObserver`.** [Table.tsx:31-38](src/components/Table/Table.tsx#L31-L38) measures once on mount with `clientHeight` (excludes border). An observer is the native answer and survives font loading.
- [ ] **Keyboard access to field details.** [Field.tsx:88](src/components/Field/Field.tsx#L88) is a `<button>` with no `onClick` and a hover-only detail panel. Add `onFocus`/`onBlur` next to the mouse handlers.
- [ ] **Handles nested inside the button** — nested interactive elements. Move `{handles}` out of the `<button>`.
- [ ] **Unify the DBML types.** [types.d.ts](src/types.d.ts) derives from `ReturnType<Parser["parse"]>` (instance type) while the code calls `Parser.parse` statically, and [DbmlRenderer.tsx:3](src/DbmlRenderer.tsx#L3) imports `Database` directly. Pick one source.
- [ ] **`rollup-plugin-visualizer` writes `stats.html` on every build** — gate it behind an env flag.

## Project hygiene

- [ ] One smoke test: parse a schema, assert node/edge counts and that layout positions differ. Would have caught the layout bug.
- [ ] CI running `npm run lint && npm run build`.
- [ ] `prepublishOnly` script so `dist` can't go stale on publish.
- [ ] Update [CLAUDE.md](CLAUDE.md) — the "measure then feed back into dagre" description is aspirational until the first task lands.
