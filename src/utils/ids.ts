import type Ref from "@dbml/core/types/model_structure/ref";
import type { DbmlTable } from "../types";

export const createTableId = (table: DbmlTable) => {
	return `table-${table.id}`;
};

export const createRelationId = (relation: Ref) => {
	const { schema, id } = relation;
	return `relation-${schema.id}-${id}`;
};