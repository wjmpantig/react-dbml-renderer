import { Parser } from "@dbml/core";
import { expect, test } from "vitest";
import { createNodesAndEdges, getLayoutedElements } from "./layout";

const DBML = `
Table users {
  id bigint [pk]
}
Table posts {
  id bigint [pk]
  user_id bigint [ref: > users.id]
}
`;

const db = Parser.parse(DBML, "dbmlv2");

const layout = (sizes = {}) => {
	const { nodes, edges } = createNodesAndEdges(db);
	return getLayoutedElements(nodes, edges, sizes);
};

test("creates a node per table and an edge per ref", () => {
	const { nodes, edges } = layout();
	expect(nodes.map((n) => n.id).sort()).toEqual(["table-1", "table-2"]);
	expect(edges).toHaveLength(1);
	expect([edges[0].source, edges[0].target].sort()).toEqual([
		"table-1",
		"table-2",
	]);
});

test("suffixes handles with the side each edge leaves from", () => {
	const [edge] = layout().edges;
	expect(edge.sourceHandle).toMatch(/-(left|right)$/);
	expect(edge.targetHandle).toMatch(/-(left|right)$/);
	// opposite sides, so the edge does not double back on itself
	expect(edge.sourceHandle?.endsWith("-left")).toBe(
		edge.targetHandle?.endsWith("-right"),
	);
});

test("resolves the handles each field has to render", () => {
	const { nodes, edges } = layout();
	const data = (id: string) =>
		nodes.find((n) => n.id === id)?.data as {
			fieldEdges: Record<string, { handleId: string; handleType: string }[]>;
		};
	const posts = Object.values(data("table-2").fieldEdges).flat();
	const users = Object.values(data("table-1").fieldEdges).flat();
	// one ref: one handle on each side of it, and nothing else resolved
	expect(posts).toHaveLength(1);
	expect(users).toHaveLength(1);
	expect([users[0].handleType, posts[0].handleType].sort()).toEqual([
		"source",
		"target",
	]);
	// the handle ids must be the ones the edges actually point at
	const handles = [edges[0].sourceHandle, edges[0].targetHandle];
	expect(handles).toContain(users[0].handleId);
	expect(handles).toContain(posts[0].handleId);
});

test("positions are top-left, not dagre's centers", () => {
	// two ranks of one node each: dagre centers them on the same x
	const { nodes } = layout({
		"table-1": { width: 100, height: 40 },
		"table-2": { width: 300, height: 40 },
	});
	// dagre reports centers, so its leftmost/topmost node sits at half its own
	// size; converted to top-left the layout must start at the origin
	expect(Math.min(...nodes.map((n) => n.position.x))).toBe(0);
	expect(Math.min(...nodes.map((n) => n.position.y))).toBe(0);
});

test("measured sizes drive the layout instead of the fallback estimate", () => {
	const tall = layout({
		"table-1": { width: 100, height: 400 },
		"table-2": { width: 100, height: 400 },
	});
	const gap = (l: ReturnType<typeof layout>) => {
		const ys = l.nodes.map((n) => n.position.y).sort((a, b) => a - b);
		return ys[1] - ys[0];
	};
	// fallback would be 36 * (fields + 1); a measured 400px node must push further
	expect(gap(tall)).toBeGreaterThan(gap(layout()));
	// sizes must not be written onto the nodes: React Flow would pin the table
	// to them and its rows could no longer widen it
	expect(tall.nodes.every((n) => n.width === undefined)).toBe(true);
	expect(tall.nodes.every((n) => n.height === undefined)).toBe(true);
});
