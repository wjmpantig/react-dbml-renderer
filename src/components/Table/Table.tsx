import type { Node } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { useDbmlRendererContext } from "../../contexts/DbmlRendererContext";
import { createTableId } from "../../utils/ids";
import type { FieldEdge, TableData } from "../../utils/layout";
import Details from "../Details";
import Field from "../Field";
import { NoteIcon } from "../icons";
import styles from "./Table.module.scss";

// stable identity: a fresh [] per render would re-run every field's effect
const NO_EDGES: FieldEdge[] = [];

// "public" is DBML's implicit default schema, so printing it adds no information
const qualify = (schemaName: string, name: string) =>
	schemaName === "public" ? name : `${schemaName}.${name}`;

// an expression index is spelled with its parentheses; a column index is not
const indexColumns = (columns: { type: string; value: string }[]) =>
	columns
		.map((column) =>
			column.type === "expression" ? `(${column.value})` : column.value,
		)
		.join(", ");

type Props = Partial<Node> & {
	data: TableData;
};
const Table = (props: Props) => {
	const {
		data: { table, fieldEdges },
	} = props;
	const ref = useRef<HTMLDivElement>(null);
	// hover or keyboard focus on the note button, same as a column note
	const [noteActive, setNoteActive] = useState(false);
	const { setTable } = useDbmlRendererContext();

	const { fields, name, schema, alias, note, headerColor, indexes, checks } =
		table;
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
			<div
				className={styles.header}
				data-testid="table-header"
				// headercolor overrides the themed default; "none" opts back out
				style={
					headerColor && headerColor !== "none"
						? { backgroundColor: headerColor }
						: undefined
				}
			>
				{qualify(schema.name, name)}
				{alias && <span className={styles.alias}> as {alias}</span>}
				{note && (
					<button
						type="button"
						// nodrag: reading the note must not drag the table
						className={`${styles.noteButton} nodrag`}
						aria-label={`Note for ${name}`}
						onMouseEnter={() => setNoteActive(true)}
						onMouseLeave={() => setNoteActive(false)}
						onFocus={() => setNoteActive(true)}
						onBlur={() => setNoteActive(false)}
					>
						<NoteIcon className={styles.icon} />
					</button>
				)}
				{note && noteActive && <Details heading={name}>{note}</Details>}
			</div>
			{fields.map((field) => {
				return (
					<Field
						field={field}
						edges={fieldEdges[field.id] ?? NO_EDGES}
						key={field.id}
					/>
				);
			})}
			{indexes.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionTitle}>Indexes</div>
					{indexes.map((index) => (
						<div className={styles.row} key={index.id} title={index.note}>
							<code className={styles.code}>{indexColumns(index.columns)}</code>
							<span className={styles.badges}>
								{index.pk && <span title="Primary key">PK</span>}
								{index.unique && <span title="Unique">U</span>}
								{index.type && <span title="Index type">{index.type}</span>}
								{index.note && <NoteIcon className={styles.icon} />}
							</span>
						</div>
					))}
				</section>
			)}
			{checks.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionTitle}>Checks</div>
					{checks.map((check) => (
						<div className={styles.row} key={check.id} title={check.name}>
							<code className={styles.code}>{check.expression}</code>
						</div>
					))}
				</section>
			)}
		</div>
	);
};
export default Table;
