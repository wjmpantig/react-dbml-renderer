import type { TableGroup as DbmlTableGroup } from "@dbml/core";
import type { Node } from "@xyflow/react";
import styles from "./TableGroup.module.scss";

export type TableGroupData = {
	group: DbmlTableGroup;
};

type Props = Partial<Node> & {
	data: TableGroupData;
};

const TableGroup = (props: Props) => {
	const {
		data: { group },
	} = props;
	return (
		<div
			className={styles.group}
			style={group.color ? { borderColor: group.color } : undefined}
			title={group.note ?? undefined}
		>
			<div className={styles.title}>{group.name}</div>
		</div>
	);
};
export default TableGroup;
