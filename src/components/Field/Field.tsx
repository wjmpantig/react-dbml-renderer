import type Endpoint from "@dbml/core/types/model_structure/endpoint";
import type DbmlField from "@dbml/core/types/model_structure/field";
import type Ref from "@dbml/core/types/model_structure/ref";
import { type HandleType, Position, useEdges } from "@xyflow/react";
import clsx from "clsx";
import {
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FaKey, FaNoteSticky } from "react-icons/fa6";
import { useDbmlRendererContext } from "../../contexts/DbmlRendererContext";
import Relation from "../Relation/Relation";
import styles from "./Field.module.scss";

type Props = HTMLAttributes<HTMLDivElement> & {
	field: DbmlField;
};

const Field = (props: Props) => {
	const { field } = props;
	const { name, type, not_null, pk, note, id, _enum, dbdefault } = field;
	const edges = useEdges();

	const handleIdPrefix = `field-${id}-`;
	const connectedEdges = edges.filter(
		(edge) =>
			edge.sourceHandle?.startsWith(handleIdPrefix) ||
			edge.targetHandle?.startsWith(handleIdPrefix),
	);
	// connectedEdges is a fresh array every render; key effects/memos off the ids
	const connectedEdgeIds = connectedEdges.map((edge) => edge.id).join("|");
	const connectedEdgesRef = useRef(connectedEdges);
	connectedEdgesRef.current = connectedEdges;

	const [hovered, setHovered] = useState(false);
	const { animatedEdges, addAnimatedEdges, removeAnimatedEdges } =
		useDbmlRendererContext();
	const handles = connectedEdges.map<ReactNode>((edge) => {
		const regex = /field-\d+-(source|target)-(left|right)/;
		const isSource = edge.sourceHandle?.startsWith(handleIdPrefix);
		const { sourceHandle, targetHandle } = edge;
		const handleId = isSource ? sourceHandle : targetHandle;
		const [, handleType, position] = handleId?.match(regex) || [];
		const ref = edge.data?.ref as Ref;
		if (!ref) {
			return null;
		}
		const [source, target] = ref.endpoints;
		const isTarget = handleType === "target";
		const endpoint: Endpoint = isTarget ? target : source;
		return (
			<Relation
				key={edge.id}
				id={handleId}
				type={handleType as HandleType}
				position={position === "left" ? Position.Left : Position.Right}
				relation={endpoint.relation}
			/>
		);
	});
	const hasDetails = !!note || !!_enum || !!dbdefault;
	// biome-ignore lint/correctness/useExhaustiveDependencies: connectedEdgeIds is the re-run trigger for the ref read below
	useEffect(() => {
		if (!hovered) return;
		// snapshot: the cleanup must remove exactly what this run added, even if
		// the edges changed or the field unmounted while hovered
		const added = connectedEdgesRef.current;
		addAnimatedEdges(added);
		return () => removeAnimatedEdges(added);
	}, [hovered, connectedEdgeIds, addAnimatedEdges, removeAnimatedEdges]);
	const highlighted = useMemo(() => {
		const ids = new Set(connectedEdgeIds.split("|"));
		return animatedEdges.some((edge) => ids.has(edge.id));
	}, [animatedEdges, connectedEdgeIds]);
	return (
		<div className={styles.fieldContainer}>
			<button
				className={clsx(styles.field, highlighted && styles.fieldHighlighted)}
				type="button"
				onMouseEnter={() => {
					setHovered(true);
				}}
				onMouseLeave={() => {
					setHovered(false);
				}}
			>
				<div className={styles.label}>
					<span
						className={clsx(styles.fieldName, pk && styles.fieldNamePk)}
						title={note}
					>
						{name}
						{pk && <FaKey className={styles.icon} />}
						{note && <FaNoteSticky className={styles.icon} />}
					</span>
				</div>
				{handles}
				<div className={styles.properties}>
					<span className={styles.dataType}>
						<code className={styles.code}>{type?.type_name}</code>
					</span>
					{!!_enum && <span title="Enum">E</span>}
					{not_null && <span title="Not null">NN</span>}
				</div>
			</button>
			{hasDetails && hovered && (
				<aside className={styles.details}>
					<div className={styles.detailsFieldName}>{name}</div>
					<div className={styles.detailsContent}>
						{_enum && (
							<div>
								<div className={styles.nowrap}>ENUM {_enum.name}</div>
								<ul className={styles.enumList}>
									{_enum.values.map((value) => {
										return (
											<li key={value.id}>
												<code className={styles.code}>{value.name}</code>
											</li>
										);
									})}
								</ul>
							</div>
						)}
						{note && <div>{note}</div>}
						{dbdefault && (
							<div className={styles.nowrap}>
								DEFAULT <code className={styles.code}>{dbdefault?.value}</code>
							</div>
						)}
					</div>
				</aside>
			)}
		</div>
	);
};

export default Field;
