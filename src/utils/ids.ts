import type { DbmlTable } from "../types";

export const createTableId = (table: DbmlTable) => {
	return `table-${table.id}`;
};
