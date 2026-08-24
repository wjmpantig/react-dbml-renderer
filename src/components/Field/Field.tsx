import type { Field as DbmlField } from "@dbml/core";
import { Position } from "@xyflow/react";
import clsx from "clsx";
import { type HTMLAttributes, useEffect, useMemo, useState } from "react";
import { useDbmlRendererContext } from "../../contexts/DbmlRendererContext";
import type { FieldEdge } from "../../utils/layout";
import Details from "../Details";
import { KeyIcon, NoteIcon } from "../icons";
import Relation from "../Relation/Relation";
import styles from "./Field.module.scss";

// spell the default the way DBML does, so an expression default cannot be
// mistaken for a string literal of the same text
const formatDefault = (dbdefault: DbmlField["dbdefault"]) => {
	const { type, value } = dbdefault;
	if (type === "expression") return `\`${value}\``;
	if (type === "string") return `'${value}'`;
	return `${value}`;
};

type Props = HTMLAttributes<HTMLDivElement> & {
	field: DbmlField;
	edges: FieldEdge[];
};

const Field = (props: Props) => {
	const { field, edges } = props;
	const {
		name,
		type,
		not_null,
		pk,
		unique,
		increment,
		note,
		_enum,
		dbdefault,
	} = field;

	// type_name already carries any args ("varchar(254)"), so only the schema
	// qualifier is missing on a cross-schema type
	const typeName = type?.schemaName
		? `${type.schemaName}.${type.type_name}`
		: type?.type_name;

	// hover or keyboard focus: both reveal the details panel
	const [active, setActive] = useState(false);
	const { animatedEdgeIds, addAnimatedEdges, removeAnimatedEdges } =
		useDbmlRendererContext();

	const edgeIds = useMemo(() => edges.map((edge) => edge.id), [edges]);
	const hasDetails = !!note || !!_enum || !!dbdefault;

	useEffect(() => {
		if (!active) return;
		addAnimatedEdges(edgeIds);
		// remove exactly what this run added, even if the field unmounts hovered
		return () => removeAnimatedEdges(edgeIds);
	}, [active, edgeIds, addAnimatedEdges, removeAnimatedEdges]);

	const highlighted = useMemo(
		() => edgeIds.some((id) => animatedEdgeIds.has(id)),
		[animatedEdgeIds, edgeIds],
	);

	return (
		<div className={styles.fieldContainer}>
			<button
				className={clsx(styles.field, highlighted && styles.fieldHighlighted)}
				type="button"
				onMouseEnter={() => setActive(true)}
				onMouseLeave={() => setActive(false)}
				onFocus={() => setActive(true)}
				onBlur={() => setActive(false)}
			>
				<div className={styles.label}>
					<span
						className={clsx(styles.fieldName, pk && styles.fieldNamePk)}
						title={note}
					>
						{name}
						{pk && <KeyIcon className={styles.icon} />}
						{note && <NoteIcon className={styles.icon} />}
					</span>
				</div>
				<div className={styles.properties}>
					<span className={styles.dataType}>
						<code className={styles.code}>{typeName}</code>
					</span>
					{!!_enum && <span title="Enum">E</span>}
					{not_null && <span title="Not null">NN</span>}
					{unique && <span title="Unique">U</span>}
					{increment && <span title="Auto-increment">AI</span>}
				</div>
			</button>
			{edges.map((edge) => (
				<Relation
					key={`${edge.id}-${edge.handleType}`}
					id={edge.handleId}
					type={edge.handleType}
					position={edge.position === "left" ? Position.Left : Position.Right}
					relation={edge.relation}
				/>
			))}
			{hasDetails && active && (
				<Details heading={name}>
					{_enum && (
						<div>
							<div className={styles.nowrap}>ENUM {_enum.name}</div>
							<ul className={styles.enumList}>
								{_enum.values.map((value) => {
									return (
										<li key={value.id}>
											<code className={styles.code}>{value.name}</code>
											{value.note && <span> — {value.note}</span>}
										</li>
									);
								})}
							</ul>
						</div>
					)}
					{note && <div>{note}</div>}
					{dbdefault && (
						<div className={styles.nowrap}>
							DEFAULT{" "}
							<code className={styles.code}>{formatDefault(dbdefault)}</code>
						</div>
					)}
				</Details>
			)}
		</div>
	);
};

export default Field;
