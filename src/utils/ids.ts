import type { Enum, Ref, StickyNote, TableGroup } from "@dbml/core";
import type { DbmlTable } from "../types";

export const createTableId = (table: DbmlTable) => {
	return `table-${table.id}`;
};

// a composite ref draws one edge per column pair, so the column index is part
// of the id: without it every pair of a.(x,y) > b.(p,q) collides
export const createRelationId = (relation: Ref, columnIndex = 0) => {
	const { schema, id } = relation;
	return `relation-${schema.id}-${id}-${columnIndex}`;
};

export const createEnumId = (dbmlEnum: Enum) => {
	return `enum-${dbmlEnum.id}`;
};

export const createStickyNoteId = (note: StickyNote) => {
	return `sticky-${note.id}`;
};

export const createGroupId = (group: TableGroup) => {
	return `group-${group.id}`;
};
