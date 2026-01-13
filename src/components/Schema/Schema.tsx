import type DbmlSchema from "@dbml/core/types/model_structure/schema";
import Table from "../Table";

type Props = {
	data: DbmlSchema;
};
const Schema = (props: Props) => {
	const { data } = props;
	return (
		<svg>
			{data.tables.map((table) => {
				return <Table key={table.id} data={{ table }} />;
			})}
		</svg>
	);
};

export default Schema;
