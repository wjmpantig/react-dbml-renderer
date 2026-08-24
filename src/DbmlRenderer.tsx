import { type CompilerDiagnostics, Parser } from "@dbml/core";
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
import { createNodesAndEdges, getLayoutedElements } from "./utils/layout";

type Props = {
	content: string;
	colorMode?: "light" | "dark" | "system";
};

const nodeTypes = {
	table: Table,
};

const DbmlRenderer = (props: Props) => {
	const { content, colorMode = "system" } = props;
	const [tableSizes, setTables] = useState<DbmlRendererContextValue["tables"]>(
		{},
	);
	const [animatedEdges, setAnimatedEdges] = useState<Edge[]>([]);
	const database = useMemo(() => {
		try {
			const db = Parser.parse(content, "dbmlv2");
			return { db, error: null };
		} catch (e) {
			const compilerError = e as CompilerDiagnostics;
			if (Array.isArray(compilerError?.diags)) {
				const error = compilerError.diags
					.map(
						(d) =>
							`[${d.location.start.line}:${d.location.start.column}]: ${d.message}`,
					)
					.join("\n");
				return { db: null, error };
			}
			return {
				db: null,
				error: e instanceof Error ? e.message : "Invalid DBML",
			};
		}
	}, [content]);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges] = useEdgesState<Edge>([]);

	useEffect(() => {
		if (!database.db) {
			setNodes([]);
			setEdges([]);
			return;
		}
		const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(
			database.db,
			tableSizes,
			styles.edge,
		);
		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			newNodes,
			newEdges,
			tableSizes,
		);
		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
	}, [database, tableSizes, setEdges, setNodes]);

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
		setTables((prev) => {
			const current = prev[id];
			if (
				current?.width === dimension.width &&
				current?.height === dimension.height
			) {
				return prev;
			}
			return { ...prev, [id]: dimension };
		});
	}, []);
	const addAnimatedEdges = useCallback((edges: Edge[]) => {
		setAnimatedEdges((prev) => [...prev, ...edges]);
	}, []);
	const removeAnimatedEdges = useCallback((edges: Edge[]) => {
		const ids = edges.map((edge) => edge.id);
		setAnimatedEdges((prev) => prev.filter((edge) => !ids.includes(edge.id)));
	}, []);
	const contextValue = useMemo(
		() => ({
			tables: tableSizes,
			setTable,
			refs: edges,
			animatedEdges,
			addAnimatedEdges,
			removeAnimatedEdges,
		}),
		[
			tableSizes,
			setTable,
			edges,
			animatedEdges,
			addAnimatedEdges,
			removeAnimatedEdges,
		],
	);

	return (
		<DbmlRendererContext value={contextValue}>
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
						colorMode={colorMode}
					>
						<Background />
						<Controls>
							<ControlButton
								onClick={toggleFullscreen}
								title="Toggle fullscreen"
							>
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
