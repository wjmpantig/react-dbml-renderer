import dagre from "@dagrejs/dagre";
import { Parser } from "@dbml/core";
import type Database from "@dbml/core/types/model_structure/database";
import {
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	type ReactFlowInstance,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Table from "./components/Table";
import {
	DbmlRendererContext,
	type DbmlRendererContextValue,
	type Dimension,
} from "./contexts/DbmlRendererContext";
import styles from "./DbmlRenderer.module.scss";
import { createRelationId, createTableId } from "./utils/ids";

type Props = {
	content: string;
};

type NodesEdges = {
	nodes: Node[];
	edges: Edge[];
};

const nodeWidth = 172;
const nodeHeight = 36;

const nodeTypes = {
	table: Table,
};

const DbmlRenderer = (props: Props) => {
	const { content } = props;
	const [tableSizes, setTables] = useState<DbmlRendererContextValue["tables"]>(
		{},
	);
	const [animatedEdges, setAnimatedEdges] = useState<Edge[]>([]);
	const reactFlowInstance = useRef<null | ReactFlowInstance>(null);
	const database = useMemo(() => {
		try {
			const ast = Parser.parse(content, "dbmlv2");
			return ast;
		} catch (e) {
			console.error(e);
			return null;
		}
	}, [content]);
	const ref = useRef(null);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges] = useEdgesState<Edge>([]);
	const createNodesAndEdges = useCallback(
		(database: Database): NodesEdges => {
			const data = database.schemas.reduce<NodesEdges>(
				({ nodes, edges }, schema) => {
					const newNodes = schema.tables.map<Node>((table) => {
						const tableId = createTableId(table);
						const { width, height } = tableSizes[tableId] || {};
						return {
							id: tableId,
							type: "table",
							width,
							height,
							position: { x: 0, y: 0 },
							data: { table },
							draggable: true,
						};
					});
					const newEdges = schema.refs.map<Edge>((ref) => {
						const { endpoints } = ref;
						const [source, target] = endpoints;
						const { id: sourceFieldId, table: sourceTable } = source.fields[0];
						const { id: targetFieldId, table: targetTable } = target.fields[0];
						const sourceHandle = `field-${sourceFieldId}-source`;
						const targetHandle = `field-${targetFieldId}-target`;
						const refId = createRelationId(ref);
						const animated = animatedEdges.some((edge) => edge.id === refId);
						const className = clsx(
							styles.edge,
							animated && styles.edgeAnimated,
						);
						return {
							id: refId,
							source: createTableId(sourceTable),
							target: createTableId(targetTable),
							sourceHandle,
							targetHandle,
							type: "step",
							data: { ref },
							animated,
							className: className,
						};
					});
					return {
						nodes: nodes.concat(newNodes),
						edges: edges.concat(newEdges),
					};
				},
				{ nodes: [], edges: [] },
			);

			return data;
		},
		[tableSizes, animatedEdges],
	);
	const getLayoutedElements = useCallback(
		(nodes: Node[], edges: Edge[], direction = "TB") => {
			const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(
				() => ({}),
			);
			dagreGraph.setGraph({
				rankdir: direction, // top-bottom or left-right
				nodesep: 50 * 3, // space between nodes in the same rank
				ranksep: 50 * 3, // space between rows/columns
			});

			nodes.forEach((node) => {
				const tableSize = tableSizes[node.id] || {
					width: nodeWidth,
					height: nodeHeight,
				};
				dagreGraph.setNode(node.id, tableSize);
			});

			edges.forEach((edge) => {
				dagreGraph.setEdge(edge.source, edge.target);
			});

			dagre.layout(dagreGraph);

			const layoutedNodes = nodes.map((node) => {
				const nodeWithPosition = dagreGraph.node(node.id);

				const newNode = {
					...node,
					position: {
						x: nodeWithPosition.x,
						y: nodeWithPosition.y,
					},
				};

				return newNode;
			});
			const findNode = (id: string) => {
				return layoutedNodes.find((node) => id === node.id);
			};
			const newEdges = edges.map((edge) => {
				const { target, source } = edge;
				const sourceNode = findNode(source);
				const targetNode = findNode(target);
				if (!sourceNode || !targetNode) {
					console.error(
						`cant find source or target node, source: ${source} target: ${target}`,
					);
					return edge;
				}
				const { x: sourceX } = sourceNode.position;
				const { x: targetX } = targetNode.position;
				const newEdge = { ...edge };

				if (sourceX >= targetX) {
					newEdge.sourceHandle = `${edge.sourceHandle}-left`;
					newEdge.targetHandle = `${edge.targetHandle}-right`;
				} else if (sourceX < targetX) {
					newEdge.sourceHandle = `${edge.sourceHandle}-right`;
					newEdge.targetHandle = `${edge.targetHandle}-left`;
				}
				return newEdge;
			});

			return { nodes: layoutedNodes, edges: newEdges };
		},
		[tableSizes],
	);
	useEffect(() => {
		if (!database) {
			setNodes([]);
			return;
		}
		const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(database);

		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			newNodes,
			newEdges,
		);
		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
	}, [database, createNodesAndEdges, getLayoutedElements, setEdges, setNodes]);

	// useEffect(() => {
	// 	if (!reactFlowInstance.current) {
	// 		return;
	// 	}
	// 	reactFlowInstance.current.fitView({
	// 		nodes,
	// 	});
	// 	console.log("fit view");
	// }, [nodes]);

	return (
		<DbmlRendererContext
			value={{
				tables: tableSizes,
				setTable: (id: string, dimension: Dimension) => {
					setTables((prev) => {
						const newValue = {
							...prev,
							[id]: dimension,
						};

						return newValue;
					});
				},
				refs: edges,
				animatedEdges,
				addAnimatedEdges: (edges) => {
					setAnimatedEdges((prev) => [...prev, ...edges]);
				},
				removeAnimatedEdges: (edges) => {
					const ids = edges.map((edge) => edge.id);
					setAnimatedEdges((prev) =>
						prev.filter((edge) => !ids.includes(edge.id)),
					);
				},
			}}
		>
			<div className={styles.container}>
				<ReactFlow
					nodes={nodes}
					onNodesChange={onNodesChange}
					edges={edges}
					fitView
					ref={ref}
					nodeTypes={nodeTypes}
					colorMode="system"
					onInit={(instance) => {
						reactFlowInstance.current = instance;
					}}
				>
					<Background />
					<Controls />
					<MiniMap />
				</ReactFlow>
			</div>
		</DbmlRendererContext>
	);
};
export default DbmlRenderer;
