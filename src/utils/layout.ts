import dagre from "@dagrejs/dagre";
import type { Database, TableGroup as DbmlTableGroup, Ref } from "@dbml/core";
import type { Edge, Node } from "@xyflow/react";
import type { EnumNodeData } from "../components/EnumNode";
import type { StickyNoteData } from "../components/StickyNote";
import type { TableGroupData } from "../components/TableGroup";
import type { Dimension } from "../contexts/DbmlRendererContext";
import type { DbmlTable } from "../types";
import {
	createEnumId,
	createGroupId,
	createRelationId,
	createStickyNoteId,
	createTableId,
} from "./ids";

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

// what an edge remembers about the column pair it was built from, so the handle
// pass never has to walk ref.endpoints again (and never has to guess at [0])
export type RefEdgeData = {
	ref: Ref;
	sourceFieldId: number;
	targetFieldId: number;
	sourceRelation: string;
	targetRelation: string;
};

export type TableData = {
	table: DbmlTable;
	fieldEdges: Record<string, FieldEdge[]>;
};

export type TableSizes = Record<string, Dimension>;

const DEFAULT_NODE_WIDTH = 172;
const DEFAULT_ROW_HEIGHT = 36;

// rows the table renders before it has been measured: the header, every field,
// and a titled section per index/check block. Underestimating here makes the
// first paint overlap, so it has to track what Table actually draws.
export const estimateRows = (node: Node) => {
	const { table } = node.data as TableData;
	// only tables have rows to count; enums and sticky notes get measured
	if (!table) return 2;
	const { fields, indexes, checks } = table;
	const section = (rows: number) => (rows > 0 ? rows + 1 : 0);
	return 1 + fields.length + section(indexes.length) + section(checks.length);
};

const getNodeSize = (node: Node, sizes: TableSizes): Dimension =>
	sizes[node.id] ?? {
		width: DEFAULT_NODE_WIDTH,
		height: DEFAULT_ROW_HEIGHT * estimateRows(node),
	};

// name and referential actions, as the diagram caption for a ref
const refLabel = (ref: Ref) => {
	const actions = [
		ref.onDelete && `on delete ${ref.onDelete}`,
		ref.onUpdate && `on update ${ref.onUpdate}`,
	].filter(Boolean);
	return [ref.name, ...actions].filter(Boolean).join(" ") || undefined;
};

export const createNodesAndEdges = (
	database: Database,
	edgeClassName?: string,
): NodesEdges =>
	database.schemas.reduce<NodesEdges>(
		({ nodes, edges }, schema) => {
			// an enum used by no column would otherwise be invisible
			const enumNodes = schema.enums.map<Node>((dbmlEnum) => ({
				id: createEnumId(dbmlEnum),
				type: "enum",
				position: { x: 0, y: 0 },
				data: { enum: dbmlEnum } satisfies EnumNodeData,
				draggable: true,
			}));
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
			// a composite ref pairs its columns positionally:
			// a.(x, y) > b.(p, q) is x->p and y->q, so it draws one edge per pair
			const newEdges = schema.refs.flatMap<Edge>((ref) => {
				const [source, target] = ref.endpoints;
				return source.fields.map<Edge>((sourceField, index) => {
					const targetField = target.fields[index] ?? target.fields[0];
					return {
						id: createRelationId(ref, index),
						source: createTableId(sourceField.table),
						target: createTableId(targetField.table),
						sourceHandle: `field-${sourceField.id}-source`,
						targetHandle: `field-${targetField.id}-target`,
						type: "step",
						data: {
							ref,
							sourceFieldId: sourceField.id,
							targetFieldId: targetField.id,
							sourceRelation: source.relation,
							targetRelation: target.relation,
						} satisfies RefEdgeData,
						animated: false,
						className: edgeClassName,
						style: {
							...(ref.color ? { stroke: ref.color } : {}),
							// an inactive ref is documented, not enforced: dot the line
							...(ref.inactive ? { strokeDasharray: "6 4" } : {}),
						},
						// one caption per ref, not one per column of a composite
						label: index === 0 ? refLabel(ref) : undefined,
					};
				});
			});
			return {
				nodes: nodes.concat(newNodes, enumNodes),
				edges: edges.concat(newEdges),
			};
		},
		{
			// sticky notes hang off the database, not a schema
			nodes: database.notes.map<Node>((note) => ({
				id: createStickyNoteId(note),
				type: "stickyNote",
				position: { x: 0, y: 0 },
				data: { note } satisfies StickyNoteData,
				draggable: true,
			})),
			edges: [],
		},
	);

export const getLayoutedElements = (
	nodes: Node[],
	edges: Edge[],
	sizes: TableSizes = {},
	direction = "TB",
): NodesEdges => {
	// multigraph: named edges, so parallel refs stay distinct layout constraints
	const dagreGraph = new dagre.graphlib.Graph({
		multigraph: true,
	}).setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: direction, // top-bottom or left-right
		nodesep: 75, // space between nodes in the same rank
		ranksep: 25, // space between rows/columns
	});

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, getNodeSize(node, sizes));
	});
	edges.forEach((edge) => {
		// dagre keys edges by node pair, so without a name every ref between the
		// same two tables collapses into one layout constraint
		dagreGraph.setEdge(edge.source, edge.target, {}, edge.id);
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
		// a self-loop has no two positions to compare: keep both handles on one
		// side so it loops out and back instead of crossing the whole table
		const [from, to] =
			edge.source === edge.target
				? ["right", "right"]
				: source.x > target.x
					? ["left", "right"]
					: ["right", "left"];
		const newEdge = {
			...edge,
			sourceHandle: `${edge.sourceHandle}-${from}`,
			targetHandle: `${edge.targetHandle}-${to}`,
		};

		const data = edge.data as RefEdgeData | undefined;
		if (data?.ref) {
			addFieldEdge(edge.source, `${data.sourceFieldId}`, {
				id: edge.id,
				handleId: newEdge.sourceHandle,
				handleType: "source",
				position: from as FieldEdge["position"],
				relation: data.sourceRelation,
			});
			addFieldEdge(edge.target, `${data.targetFieldId}`, {
				id: edge.id,
				handleId: newEdge.targetHandle,
				handleType: "target",
				position: to as FieldEdge["position"],
				relation: data.targetRelation,
			});
		}

		return newEdge;
	});

	const nodesWithEdges = layoutedNodes.map((node) => ({
		...node,
		data: { ...node.data, fieldEdges: fieldEdges[node.id] ?? {} },
	}));

	return { nodes: withGroups(nodesWithEdges, sizes), edges: newEdges };
};

// padding around a group's members, and the strip its title sits in
const GROUP_PADDING = 16;
const GROUP_HEADER = 24;

// Table groups are drawn as React Flow parent nodes rather than taught to dagre
// as a compound graph: lay the tables out normally, then wrap each group in a
// box sized to whatever its members ended up occupying.
const withGroups = (nodes: Node[], sizes: TableSizes): Node[] => {
	const members = new Map<string, { group: DbmlTableGroup; nodes: Node[] }>();
	for (const node of nodes) {
		const group = (node.data as TableData).table?.group;
		if (!group) continue;
		const id = createGroupId(group);
		const entry = members.get(id) ?? { group, nodes: [] };
		entry.nodes.push(node);
		members.set(id, entry);
	}
	if (members.size === 0) return nodes;

	const groupNodes: Node[] = [];
	const reparented = new Map<string, Node>();

	for (const [groupId, { group, nodes: children }] of members) {
		const boxes = children.map((node) => {
			const { width, height } = getNodeSize(node, sizes);
			return { node, width, height };
		});
		const minX = Math.min(...boxes.map((b) => b.node.position.x));
		const minY = Math.min(...boxes.map((b) => b.node.position.y));
		const maxX = Math.max(...boxes.map((b) => b.node.position.x + b.width));
		const maxY = Math.max(...boxes.map((b) => b.node.position.y + b.height));

		const origin = {
			x: minX - GROUP_PADDING,
			y: minY - GROUP_PADDING - GROUP_HEADER,
		};
		groupNodes.push({
			id: groupId,
			type: "tableGroup",
			position: origin,
			data: { group } satisfies TableGroupData,
			width: maxX - minX + GROUP_PADDING * 2,
			height: maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER,
			draggable: true,
			selectable: false,
		});

		for (const { node } of boxes) {
			reparented.set(node.id, {
				...node,
				parentId: groupId,
				extent: "parent",
				// a child's position is relative to its parent
				position: {
					x: node.position.x - origin.x,
					y: node.position.y - origin.y,
				},
			});
		}
	}

	// React Flow requires a parent to come before its children
	return [
		...groupNodes,
		...nodes.map((node) => reparented.get(node.id) ?? node),
	];
};
