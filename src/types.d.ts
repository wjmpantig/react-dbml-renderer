import type { Parser } from "@dbml/core";

// Database returned by Parser.parse(...)
type DbmlDatabase = ReturnType<Parser["parse"]>;
type DbmlSchema = DbmlDatabase["schemas"][number];

// This replaces your old DbmlTable type
export type DbmlTable = DbmlSchema["tables"][number];
