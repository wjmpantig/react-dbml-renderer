# React DBML Renderer

A React component for rendering DBML (Database Markup Language) schemas.

## Installation

```bash
npm install @xyflow/react @dbml/core @wjmpantig/react-dbml-renderer
```

## Usage

```tsx
import { DbmlRenderer } from "@wjmpantig/react-dbml-renderer";
import '@xyflow/react/dist/style.css';
import '@wjmpantig/react-dbml-renderer/dist/style.css';

function App() {
  const schema = `
    Table public.users {
      id              bigint [pk, increment]
      email           varchar(254) [not null, unique]
      username        varchar(50) [not null, unique]
      password_hash   varchar(255) [not null]
      status          user_status [not null, default: 'ACTIVE']
      created_at      timestamptz [not null, default: \`now()\`]
      updated_at      timestamptz [not null, default: \`now()\`]
      referrer_id     bigint [note: 'Self-ref: referral tree']

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