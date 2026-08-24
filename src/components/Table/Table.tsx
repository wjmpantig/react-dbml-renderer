import type { Node } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useDbmlRendererContext } from "../../contexts/DbmlRendererContext";
import { createTableId } from "../../utils/ids";
import type { FieldEdge, TableData } from "../../utils/layout";
import Field from "../Field";
import styles from "./Table.module.scss";

// stable identity: a fresh [] per render would re-run every field's effect
const NO_EDGES: FieldEdge[] = [];

type Props = Partial<Node> & {
	data: TableData;
};
const Table = (props: Props) => {
	const {
		data: { table, fieldEdges },
	} = props;
	const ref = useRef<HTMLDivElement>(null);
	const { setTable } = useDbmlRendererContext();

	const { fields, name, schema } = table;
	const tableId = createTableId(table);
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		// report the box dagre has to lay out, and keep reporting it as fonts
		// load or the content changes; setTable ignores unchanged measurements
		const observer = new ResizeObserver(() => {
			setTable(tableId, {
				width: element.offsetWidth,
				height: element.offsetHeight,
			});
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [tableId, setTable]);

	return (
		<div className={styles.table} ref={ref}>
			<div className={styles.header}>{`${schema.name}.${name}`}</div>
			{fields.map((field) => {
				return (
					<Field
						field={field}
						edges={fieldEdges[field.id] ?? NO_EDGES}
						key={field.id}
					/>
				);
			})}
		</div>
	);
};
export default Table;
