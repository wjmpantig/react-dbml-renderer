# Tasks

## Done: @dbml/core 10 upgrade + full spec coverage

Shipped on `feat/dbml-10-full-coverage`. The renderer was audited against the
official DBML spec (`holistics/dbml` → `dbml-homepage/docs/`); the parser was 5
majors behind and the renderer read a narrow slice of the AST. Both are closed.

- [x] **Upgrade `@dbml/core` 5.1.0 → 10.1.1**, library `2.0.0` (breaking: the peer
  dep moved too). v10 ships an `exports` map with only `"."`, so the six
  `@dbml/core/types/model_structure/*` deep imports stopped resolving under
  `moduleResolution: bundler`; they now import named types from the package root.
- [x] **Composite refs** — [layout.ts](src/utils/layout.ts) indexed `fields[0]`, so
  `a.(x, y) > b.(p, q)` drew one edge and silently implied `y`/`q` were
  uninvolved. Columns are paired positionally, one edge each.
- [x] **Parallel refs** between one table pair collapsed into a single dagre
  constraint (`setEdge` keys by node pair). The graph is a multigraph now and
  each edge is named.
- [x] **Self-referencing refs** compared identical positions and always resolved
  `right→left`; both handles stay on one side.
- [x] **Multi-line column notes** collapsed to one line — `.details-content` was
  missing `white-space: pre-wrap`.
- [x] Field gaps: `unique` (U) and `increment` (AI) badges, `dbdefault.type` so an
  expression default cannot read as a string literal, `type.schemaName` on
  cross-schema types, enum value notes.
- [x] Table gaps: `note`, `alias`, `headercolor`, an **Indexes** section, a
  **Checks** section, and the implicit `public.` prefix dropped. The pre-measure
  row estimate counts the new sections.
- [x] Optional cardinality (`>?`, `?>`, `-?`, `<>?`) — the cardinality domain
  widened to `1 | 0..1 | * | 0..*` in v10, so the old two-entry style map would
  have rendered no glyph. CSS reads the value off `attr(data-cardinality)`.
- [x] `inactive` refs (dashed), `ref.color`, and `ref.name` / `delete:` /
  `update:` as edge labels.
- [x] TableGroup boxes, sticky notes, and standalone enum nodes.
- [x] Tests: 11 vitest cases and 16 Playwright specs (`npm run test:e2e`), wired
  into CI.

## Open

- [ ] **`records` / Data Sample** is still unrendered. v10 parses it
  (`table.records`, `database.records`); nothing reads it. Needs a decision on
  where sample rows belong in a diagram before it is worth building.
- [ ] **Custom metadata** (`[owner: "team"]`, `Metadata Table x { … }`) parses into
  `table.metadata` / `field.metadata` and is dropped. Cheap to surface in the
  details panel if anyone asks for it.
- [ ] **`DiagramView`** — v10 parses named views that filter the diagram to a
  subset of tables/notes/groups/schemas. Would need a view switcher in the UI.
- [ ] **Module system** (`use` / `reuse` / selective import) needs a filesystem or
  a caller-supplied resolver; `Parser.parse` on a single string cannot follow
  imports. `parseDbmlProject` + `MemoryProjectLayout` is the hook if this is
  wanted.
- [ ] **Parse errors are all-or-nothing** — one bad token replaces the whole canvas
  ([DbmlRenderer.tsx](src/DbmlRenderer.tsx)). Rendering the tables that did parse
  would be friendlier, but @dbml/core throws rather than returning a partial AST.
- [ ] **Group layout is post-hoc.** Boxes are bounding boxes over dagre's output
  rather than a constraint dagre respects, so a group's members can be spread far
  apart and the box grows to cover unrelated space. Teaching dagre a compound
  graph (clusters) is the real fix.
- [ ] ~~Hover/highlight has no test~~ — closed: covered by
  [e2e/interaction.spec.ts](e2e/interaction.spec.ts).

## Notes

- Biome does not lint `example/` — it is a separate project with its own config.
- `src/App.tsx` (the `npm run dev` demo) and [example/](example/) both stay: the
  root one renders from source, `example/` is the packaged-consumer test via yalc.
  The root demo's schema is also the Playwright fixture and exercises every
  supported feature — `?dbml=...` overrides it for focused specs.
