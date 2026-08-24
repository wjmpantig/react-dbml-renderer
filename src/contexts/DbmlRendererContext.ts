import { createContext, useContext } from "react";
export type Dimension = {
	width: number;
	height: number;
};
export type DbmlRendererContextValue = {
	tables: {
		[key: string]: Dimension;
	};
	setTable: (id: string, node: Dimension) => void;
	animatedEdgeIds: ReadonlySet<string>;
	addAnimatedEdges: (ids: string[]) => void;
	removeAnimatedEdges: (ids: string[]) => void;
};
export const DbmlRendererContext = createContext<DbmlRendererContextValue>({
	tables: {},
	setTable: () => {},
	animatedEdgeIds: new Set(),
	addAnimatedEdges: () => {},
	removeAnimatedEdges: () => {},
});

export const useDbmlRendererContext = () => {
	const val = useContext(DbmlRendererContext);
	if (!val) {
		throw new Error(
			"useDbmlRendererContext must be used within a DbmlRendererContext",
		);
	}
	return val;
};
