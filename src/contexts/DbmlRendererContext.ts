import type { Edge } from "@xyflow/react";
import { createContext, useContext } from "react";
export type Dimension = {
	width: number;
	height: number;
};
export type DbmlRendererContextValue = {
	tables: {
		[key: string]: Dimension;
	};
	refs: Edge[];
	setTable: (id: string, node: Dimension) => void;
	animatedEdges: Edge[];
	addAnimatedEdges: (edges: Edge[]) => void;
	removeAnimatedEdges: (edges: Edge[]) => void;
};
export const DbmlRendererContext = createContext<DbmlRendererContextValue>({
	tables: {},
	setTable: () => {},
	animatedEdges: [],
	addAnimatedEdges: () => {},
	removeAnimatedEdges: () => {},
	refs: [],
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
