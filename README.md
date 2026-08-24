# React DBML Renderer

A React component for rendering DBML (Database Markup Language) schemas as
interactive diagrams.

## Installation

```bash
npm install @xyflow/react @dbml/core @wjmpantig/react-dbml-renderer
```

> **v2 requires `@dbml/core` v10 or newer.** v1 pinned `^5.1.0`. The upgrade is
> what makes optional cardinality (`>?`), `inactive` refs and table partials
> parseable at all, so it is not optional — update `@dbml/core` alongside.

## Usage

```tsx
import { DbmlRenderer } from "@wjmpantig/react-dbml-renderer";
import '@xyflow/react/dist/style.css';
import '@wjmpantig/react-dbml-renderer/style.css';

function App() {
  const schema = `
    Table users [headercolor: #3498DB] {
      id              bigint [pk, increment]
      email           varchar(254) [not null, unique]
      status          user_status [not null, default: 'ACTIVE']
      created_at      timestamptz [not null, default: \`now()\`]

      indexes {
        (email) [unique, name: 'uq_users_email']
      }

      note: 'Application end users'
    }
  `;
  return (
    <div style={{ height: "100vh" }}>
      <DbmlRenderer content={schema} />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `string` | — | The DBML source to render. |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Passed through to React Flow. |

## Supported DBML

Everything `@dbml/core` v10 parses from a single DBML string is rendered:

**Tables** — name, schema qualifier (the implicit `public.` is omitted), alias,
`note`, `headercolor`, and per-column `pk`, `not null`, `unique`, `increment`,
type (including args and a cross-schema qualifier), `default` (expression, string
and number defaults are spelled differently so they cannot be confused), and
`note`.

**Indexes** — single, composite and expression indexes, with `unique`, `pk`,
`name`, `type: btree|hash` and `note`.

**Checks** — column `check:` and `checks { }` blocks.

**Relationships** — all four operators (`<`, `>`, `-`, `<>`) plus the optional
variants (`>?`, `?>`, `-?`, `<>?`); inline, short and long form; composite refs
(one edge per column pair); cross-schema refs; self-references; `delete:` /
`update:` actions and `ref` names as edge labels; `color`; and `inactive` refs as
dashed lines.

**Enums** — as standalone nodes (so an enum no column uses is still visible) and
inline on the columns that use them, with enum value notes.

**Table groups** — as labelled backdrop boxes, with `note` and `color`.

**Sticky notes** — top-level `Note` blocks, with `color` (including `none`).

**Table partials** — `@dbml/core` injects `~partial` fields at parse time, so
partial-contributed columns render as ordinary columns.

**Notes** — project, table, column, index and enum-value notes. Multi-line
(`''' … '''`) notes keep their line breaks.

### Not rendered

- `records` / Data Sample blocks
- custom metadata (`[owner: "team"]`, `Metadata` blocks)
- `DiagramView`
- the module system (`use` / `reuse`) — following imports needs a resolver, not a
  single string

## Interaction

- Hover or keyboard-focus a column to highlight the relationships it takes part
  in and open its details (note, enum values, default).
- Drag tables, pan, zoom, minimap, and a fullscreen toggle.

## Development

```bash
npm run dev          # Dev demo, rendered from source
npm test             # Unit tests (vitest)
npm run test:e2e     # End-to-end tests (Playwright)
npm run build        # Type check + library build
npm run lint         # Biome
```

## License

MIT
