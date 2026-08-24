import { Handle, type HandleProps } from "@xyflow/react";
import clsx from "clsx";
import type { FC } from "react";
import styles from "./Relation.module.scss";

type Props = HandleProps & {
	relation: string;
};
const POSITION_STYLES: Record<string, string> = {
	left: styles.left,
	right: styles.right,
};
const Relation: FC<Props> = (props) => {
	const { relation, position, ...otherProps } = props;

	const positionStyle = POSITION_STYLES[position];
	return (
		<Handle
			{...otherProps}
			position={position}
			// the cardinality IS the glyph ("1", "0..1", "*", "0..*"), so CSS reads
			// it straight off the attribute instead of mapping every value
			data-cardinality={relation}
			className={clsx(styles.base, positionStyle)}
		/>
	);
};
export default Relation;
