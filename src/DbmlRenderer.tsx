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
	useReactFlow,
} from "@xyflow/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompressIcon, ExpandIcon } from "./components/icons";
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

// The layout re-runs once tables report their measured size, so the initial
// fitView is stale by then. Refit on each layout, but not on node drags.
const FitOnLayout = ({ layoutId }: { layoutId: number }) => {
	const { fitView } = useReactFlow();
	// biome-ignore lint/correctness/useExhaustiveDependencies: layoutId is the trigger
	useEffect(() => {
		// wait a frame: React Flow needs to measure the new nodes before it can fit them
		const frame = requestAnimationFrame(() => fitView());
		return () => cancelAnimationFrame(frame);
	}, [layoutId, fitView]);
	return null;
};

const DbmlRenderer = (props: Props) => {
	const { content, colorMode = "system" } = props;
	const [tableSizes, setTables] = useState<DbmlRendererContextValue["tables"]>(
		{},
	);
	const [animatedEdgeIds, setAnimatedEdgeIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
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
	const [layoutId, setLayoutId] = useState(0);

	useEffect(() => {
		if (!database.db) {
			setNodes([]);
			setEdges([]);
			return;
		}
		const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(
			database.db,
			styles.edge,
		);
		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			newNodes,
			newEdges,
			tableSizes,
		);
		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
		setLayoutId((id) => id + 1);
	}, [database, tableSizes, setEdges, setNodes]);

	useEffect(() => {
		setEdges((prev) => {
			// only the edges whose state actually flipped get new objects
			let changed = false;
			const next = prev.map((edge) => {
				const animated = animatedEdgeIds.has(edge.id);
				if (animated === !!edge.animated) return edge;
				changed = true;
				return {
					...edge,
					animated,
					className: clsx(styles.edge, animated && styles.edgeAnimated),
				};
			});
			return changed ? next : prev;
		});
	}, [animatedEdgeIds, setEdges]);

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
	const addAnimatedEdges = useCallback((ids: string[]) => {
		setAnimatedEdgeIds((prev) => {
			// same set, same identity: a new Set here would re-render every field
			if (ids.every((id) => prev.has(id))) return prev;
			const next = new Set(prev);
			for (const id of ids) next.add(id);
			return next;
		});
	}, []);
	const removeAnimatedEdges = useCallback((ids: string[]) => {
		setAnimatedEdgeIds((prev) => {
			if (!ids.some((id) => prev.has(id))) return prev;
			const next = new Set(prev);
			for (const id of ids) next.delete(id);
			return next;
		});
	}, []);
	const contextValue = useMemo(
		() => ({
			tables: tableSizes,
			setTable,
			animatedEdgeIds,
			addAnimatedEdges,
			removeAnimatedEdges,
		}),
		[
			tableSizes,
			setTable,
			animatedEdgeIds,
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
						<FitOnLayout layoutId={layoutId} />
						<Background />
						<Controls>
							<ControlButton
								onClick={toggleFullscreen}
								title="Toggle fullscreen"
							>
								{isFullscreen ? <CompressIcon /> : <ExpandIcon />}
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
