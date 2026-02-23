import dagre from "@dagrejs/dagre";
import { Parser, type CompilerDiagnostics } from "@dbml/core";
import type Database from "@dbml/core/types/model_structure/database";
import {
	Background,
	ControlButton,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCompress, FaExpand } from "react-icons/fa6";
import Table from "./components/Table";
import {
	DbmlRendererContext,
	type DbmlRendererContextValue,
	type Dimension,
} from "./contexts/DbmlRendererContext";
import styles from "./DbmlRenderer.module.scss";
import type { DbmlTable } from "./types";
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
	const tableSizesRef = useRef(tableSizes);
	tableSizesRef.current = tableSizes;
	const [animatedEdges, setAnimatedEdges] = useState<Edge[]>([]);
	const database = useMemo(() => {
		try {
			const db = Parser.parse(content, "dbmlv2");
			return { db, error: null };
		} catch (e) {
			const compilerError = e as CompilerDiagnostics;
			if (Array.isArray(compilerError?.diags)) {
				const error = compilerError.diags
					.map((d) => `[${d.location.start.line}:${d.location.start.column}]: ${d.message}`)
					.join("\n");
				return { db: null, error };
			}
			return { db: null, error: e instanceof Error ? e.message : "Invalid DBML" };
		}
	}, [content]);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges] = useEdgesState<Edge>([]);
	const createNodesAndEdges = useCallback(
		(database: Database): NodesEdges => {
			const data = database.schemas.reduce<NodesEdges>(
				({ nodes, edges }, schema) => {
					const newNodes = schema.tables.map<Node>((table) => {
						const tableId = createTableId(table);
						const { width, height } = tableSizesRef.current[tableId] || {};
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
						return {
							id: refId,
							source: createTableId(sourceTable),
							target: createTableId(targetTable),
							sourceHandle,
							targetHandle,
							type: "step",
							data: { ref },
							animated: false,
							className: styles.edge,
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
		[],
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
				const tableSize = tableSizesRef.current[node.id] ?? {
					width: nodeWidth,
					// header row + one row per field
					height: nodeHeight * ((node.data as { table: DbmlTable }).table.fields.length + 1),
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

				if (sourceX > targetX) {
					newEdge.sourceHandle = `${edge.sourceHandle}-left`;
					newEdge.targetHandle = `${edge.targetHandle}-right`;
				} else {
					newEdge.sourceHandle = `${edge.sourceHandle}-right`;
					newEdge.targetHandle = `${edge.targetHandle}-left`;
				}
				return newEdge;
			});

			return { nodes: layoutedNodes, edges: newEdges };
		},
		[],
	);
	useEffect(() => {
		if (!database.db) {
			setNodes([]);
			return;
		}
		const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(database.db);

		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			newNodes,
			newEdges,
		);
		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
	}, [database, createNodesAndEdges, getLayoutedElements, setEdges, setNodes]);

	useEffect(() => {
		setEdges((prev) =>
			prev.map((edge) => {
				const animated = animatedEdges.some((e) => e.id === edge.id);
				return {
					...edge,
					animated,
					className: clsx(styles.edge, animated && styles.edgeAnimated),
				};
			}),
		);
	}, [animatedEdges, setEdges]);

	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	useEffect(() => {
		const handler = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", handler);
		return () => document.removeEventListener("fullscreenchange", handler);
	}, []);
	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			containerRef.current?.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}, []);

	const setTable = useCallback((id: string, dimension: Dimension) => {
		setTables((prev) => ({ ...prev, [id]: dimension }));
	}, []);
	const addAnimatedEdges = useCallback((edges: Edge[]) => {
		setAnimatedEdges((prev) => [...prev, ...edges]);
	}, []);
	const removeAnimatedEdges = useCallback((edges: Edge[]) => {
		const ids = edges.map((edge) => edge.id);
		setAnimatedEdges((prev) => prev.filter((edge) => !ids.includes(edge.id)));
	}, []);
	const contextValue = useMemo(
		() => ({ tables: tableSizes, setTable, refs: edges, animatedEdges, addAnimatedEdges, removeAnimatedEdges }),
		[tableSizes, setTable, edges, animatedEdges, addAnimatedEdges, removeAnimatedEdges],
	);

	return (
		<DbmlRendererContext
			value={contextValue}
		>
			<div className={styles.container} ref={containerRef}>
				{database.error ? (
					<div className={styles.error}>
						<div>
							<p>Failed to parse DBML:</p>
							{database.error}

						</div>
					</div>
				) : (
					<ReactFlow
						nodes={nodes}
						onNodesChange={onNodesChange}
						edges={edges}
						fitView
						nodeTypes={nodeTypes}
						colorMode="system"
					>
						<Background />
						<Controls>
							<ControlButton onClick={toggleFullscreen} title="Toggle fullscreen">
								{isFullscreen ? <FaCompress /> : <FaExpand />}
							</ControlButton>
						</Controls>
						<MiniMap />
					</ReactFlow>
				)}
			</div>
		</DbmlRendererContext>
	);
};
export default DbmlRenderer;
