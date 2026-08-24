import dagre from "@dagrejs/dagre";
import type Database from "@dbml/core/types/model_structure/database";
import type Ref from "@dbml/core/types/model_structure/ref";
import type { Edge, Node } from "@xyflow/react";
import type { Dimension } from "../contexts/DbmlRendererContext";
import type { DbmlTable } from "../types";
import { createRelationId, createTableId } from "./ids";

export type NodesEdges = {
	nodes: Node[];
	edges: Edge[];
};

// Everything a field needs to draw its handles, resolved once per layout so no
// field has to scan the whole edge list.
export type FieldEdge = {
	id: string;
	handleId: string;
	handleType: "source" | "target";
	position: "left" | "right";
	relation: string;
};

export type TableData = {
	table: DbmlTable;
	fieldEdges: Record<string, FieldEdge[]>;
};

export type TableSizes = Record<string, Dimension>;

const DEFAULT_NODE_WIDTH = 172;
const DEFAULT_ROW_HEIGHT = 36;

const getNodeSize = (node: Node, sizes: TableSizes): Dimension =>
	sizes[node.id] ?? {
		width: DEFAULT_NODE_WIDTH,
		// header row + one row per field
		height:
			DEFAULT_ROW_HEIGHT * ((node.data as TableData).table.fields.length + 1),
	};

export const createNodesAndEdges = (
	database: Database,
	edgeClassName?: string,
): NodesEdges =>
	database.schemas.reduce<NodesEdges>(
		({ nodes, edges }, schema) => {
			const newNodes = schema.tables.map<Node>((table) => {
				const tableId = createTableId(table);
				return {
					id: tableId,
					type: "table",
					position: { x: 0, y: 0 },
					data: { table, fieldEdges: {} } satisfies TableData,
					draggable: true,
				};
			});
			const newEdges = schema.refs.map<Edge>((ref) => {
				const [source, target] = ref.endpoints;
				const { id: sourceFieldId, table: sourceTable } = source.fields[0];
				const { id: targetFieldId, table: targetTable } = target.fields[0];
				return {
					id: createRelationId(ref),
					source: createTableId(sourceTable),
					target: createTableId(targetTable),
					sourceHandle: `field-${sourceFieldId}-source`,
					targetHandle: `field-${targetFieldId}-target`,
					type: "step",
					data: { ref },
					animated: false,
					className: edgeClassName,
				};
			});
			return {
				nodes: nodes.concat(newNodes),
				edges: edges.concat(newEdges),
			};
		},
		{ nodes: [], edges: [] },
	);

export const getLayoutedElements = (
	nodes: Node[],
	edges: Edge[],
	sizes: TableSizes = {},
	direction = "TB",
): NodesEdges => {
	const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: direction, // top-bottom or left-right
		nodesep: 75, // space between nodes in the same rank
		ranksep: 25, // space between rows/columns
	});

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, getNodeSize(node, sizes));
	});
	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const layoutedNodes = nodes.map((node) => {
		const { x, y } = dagreGraph.node(node.id);
		const { width, height } = getNodeSize(node, sizes);
		// no width/height on the node itself: that would pin it to the estimate and
		// stop the table from sizing to its own rows
		return {
			...node,
			// dagre positions nodes by their center, React Flow by their top-left
			position: { x: x - width / 2, y: y - height / 2 },
		};
	});

	const positions = new Map(
		layoutedNodes.map((node) => [node.id, node.position]),
	);
	// tableId -> fieldId -> the handles that table's field has to render
	const fieldEdges: Record<string, Record<string, FieldEdge[]>> = {};
	const addFieldEdge = (
		tableId: string,
		fieldId: string,
		fieldEdge: FieldEdge,
	) => {
		const table = fieldEdges[tableId] ?? {};
		fieldEdges[tableId] = table;
		table[fieldId] = [...(table[fieldId] ?? []), fieldEdge];
	};

	const newEdges = edges.map((edge) => {
		const source = positions.get(edge.source);
		const target = positions.get(edge.target);
		if (!source || !target) {
			return edge;
		}
		const [from, to] =
			source.x > target.x ? ["left", "right"] : ["right", "left"];
		const newEdge = {
			...edge,
			sourceHandle: `${edge.sourceHandle}-${from}`,
			targetHandle: `${edge.targetHandle}-${to}`,
		};

		const ref = edge.data?.ref as Ref | undefined;
		if (ref) {
			const [sourceEndpoint, targetEndpoint] = ref.endpoints;
			addFieldEdge(edge.source, `${sourceEndpoint.fields[0].id}`, {
				id: edge.id,
				handleId: newEdge.sourceHandle,
				handleType: "source",
				position: from as FieldEdge["position"],
				relation: sourceEndpoint.relation,
			});
			addFieldEdge(edge.target, `${targetEndpoint.fields[0].id}`, {
				id: edge.id,
				handleId: newEdge.targetHandle,
				handleType: "target",
				position: to as FieldEdge["position"],
				relation: targetEndpoint.relation,
			});
		}

		return newEdge;
	});

	const nodesWithEdges = layoutedNodes.map((node) => ({
		...node,
		data: { ...node.data, fieldEdges: fieldEdges[node.id] ?? {} },
	}));

	return { nodes: nodesWithEdges, edges: newEdges };
};
