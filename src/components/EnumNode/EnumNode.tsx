import type { Enum as DbmlEnum } from "@dbml/core";
import type { Node } from "@xyflow/react";
import styles from "./EnumNode.module.scss";

export type EnumNodeData = {
	enum: DbmlEnum;
};

type Props = Partial<Node> & {
	data: EnumNodeData;
};

// "public" is DBML's implicit default schema, so printing it adds no information
const qualify = (schemaName: string, name: string) =>
	schemaName === "public" ? name : `${schemaName}.${name}`;

const EnumNode = (props: Props) => {
	const {
		data: { enum: dbmlEnum },
	} = props;
	return (
		<div className={styles.enum}>
			<div className={styles.header}>
				{`enum ${qualify(dbmlEnum.schema.name, dbmlEnum.name)}`}
			</div>
			{dbmlEnum.values.map((value) => (
				<div className={styles.value} key={value.id}>
					<span>{value.name}</span>
					{value.note && <span className={styles.note}>{value.note}</span>}
				</div>
			))}
		</div>
	);
};
export default EnumNode;
