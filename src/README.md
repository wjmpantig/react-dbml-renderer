# react-dbml-renderer

`react-dbml-renderer` is a React component for visualizing [DBML](https://www.dbml.org/) schemas in your app.

Feed it a DBML string and it will render a structured view of your database model — perfect for docs, design systems, or internal tools.

---

## Installation

```bash
npm install react-dbml-renderer
# or
yarn add react-dbml-renderer
# or
pnpm add react-dbml-renderer
```

## Basic Usage

```tsx
import React from 'react';
import { DbmlRenderer } from 'react-dbml-renderer';

// import stylesheet
import 'react-dbml-renderer/dist/style.css';

const dbmlString = `
Table users {
  id        int [pk, increment]
  email     varchar(255) [not null, unique]
  created_at timestamptz [default: \`now()\`]
}

Table posts {
  id        int [pk, increment]
  user_id   int [not null, ref: > users.id]
  title     varchar(255) [not null]
  body      text
}
`;

export function App() {
  return (
    <div style={{ height: '100vh' }}>
      <h1>DBML Example</h1>
      <DbmlRenderer content={dbmlString} />
    </div>
  );
}
```

## Notes

This package expects valid DBML. If parsing fails, make sure your string conforms to the DBML syntax.

For best results, keep your DBML in a separate file or template literal and pass it as a string.