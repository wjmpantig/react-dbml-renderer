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
	useState,
} from "react";
import { FaKey, FaNoteSticky } from "react-icons/fa6";
import { useDbmlRendererContext } from "../../contexts/DbmlRendererContext";
import Relation from "../Relation/Relation";
import styles from "./Field.module.scss";

type Props = HTMLAttributes<HTMLDivElement> & {
	field: DbmlField;
};

// const HANDLE_TYPES = ['source','target']
// const POSITIONS = ['left','right']
const Field = (props: Props) => {
	const { field } = props;
	const {
		name,
		type,
		not_null,
		pk,
		note,
		// endpoints, table,
		id,
		_enum,
		dbdefault,
	} = field;
	const edges = useEdges();

	const handleIdPrefix = `field-${id}-`;
	const connectedEdges = edges.filter(
		(edge) =>
			edge.sourceHandle?.startsWith(handleIdPrefix) ||
			edge.targetHandle?.startsWith(handleIdPrefix),
	);

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
	// const edgeIds = connectedEdges.map((edge) => edge.id);
	useEffect(() => {
		if (hovered) {
			addAnimatedEdges(connectedEdges);
		} else {
			removeAnimatedEdges(connectedEdges);
		}
	}, [hovered]);
	const highlighted = useMemo(() => {
		return animatedEdges.some((edge) =>
			connectedEdges.some((connectedEdge) => connectedEdge.id === edge.id),
		);
	}, [animatedEdges, connectedEdges]);
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
						<code>{type?.type_name}</code>
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
												<code>{value.name}</code>
											</li>
										);
									})}
								</ul>
							</div>
						)}
						{note && <div>{note}</div>}
						{dbdefault && (
							<div className={styles.nowrap}>
								DEFAULT <code>{dbdefault?.value}</code>
							</div>
						)}
					</div>
				</aside>
			)}
		</div>
	);
};

export default Field;
