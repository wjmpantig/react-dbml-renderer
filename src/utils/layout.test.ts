import { Parser } from "@dbml/core";
import type { Node } from "@xyflow/react";
import { expect, test } from "vitest";
import {
	createNodesAndEdges,
	estimateRows,
	getLayoutedElements,
	type RefEdgeData,
	type TableData,
} from "./layout";

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

const COMPOSITE = `
Table merchant_periods {
  merchant_id bigint
  country_code varchar
}
Table merchants {
  id bigint
  country_code varchar
}
Ref: merchant_periods.(merchant_id, country_code) > merchants.(id, country_code)
`;

test("a composite ref draws one edge per column pair", () => {
	const db = Parser.parse(COMPOSITE, "dbmlv2");
	const { nodes, edges } = createNodesAndEdges(db);
	const laid = getLayoutedElements(nodes, edges);

	// two columns on each side: two edges, not the single fields[0] edge
	expect(laid.edges).toHaveLength(2);
	expect(new Set(laid.edges.map((e) => e.id)).size).toBe(2);

	// every participating column gets a handle, so none of them looks unrelated
	const handles = Object.values(
		laid.nodes.flatMap((n) => Object.entries((n.data as TableData).fieldEdges)),
	);
	expect(handles).toHaveLength(4);

	// each edge joins the columns that were actually paired in the ref
	const pairs = laid.edges.map((e) => {
		const d = e.data as RefEdgeData;
		return [d.sourceFieldId, d.targetFieldId].join("->");
	});
	expect(new Set(pairs).size).toBe(2);
});

const PARALLEL = `
Table a {
  id bigint [pk]
  x bigint
  y bigint
}
Table b {
  id bigint [pk]
  p bigint
  q bigint
}
Ref: a.x > b.p
Ref: a.y > b.q
`;

test("parallel refs between one table pair all survive", () => {
	const db = Parser.parse(PARALLEL, "dbmlv2");
	const { nodes, edges } = createNodesAndEdges(db);
	const laid = getLayoutedElements(nodes, edges);
	expect(laid.edges).toHaveLength(2);
	// distinct handles: the two refs must not land on top of each other
	expect(new Set(laid.edges.map((e) => e.sourceHandle)).size).toBe(2);
	expect(new Set(laid.edges.map((e) => e.targetHandle)).size).toBe(2);
});

const SELF = `
Table employees {
  id bigint [pk]
  manager_id bigint [ref: > employees.id]
}
`;

test("a self-referencing ref keeps both handles on one side", () => {
	const db = Parser.parse(SELF, "dbmlv2");
	const { nodes, edges } = createNodesAndEdges(db);
	const laid = getLayoutedElements(nodes, edges);
	const [edge] = laid.edges;
	expect(edge.source).toBe(edge.target);
	// same side, or the loop would cross the whole table to get back
	expect(edge.sourceHandle?.endsWith("-right")).toBe(true);
	expect(edge.targetHandle?.endsWith("-right")).toBe(true);
});

const EXTRAS = `
enum unused_status {
  A
  B
}
Table grouped_a {
  id bigint [pk]
}
Table grouped_b {
  id bigint [pk]
}
Table loner {
  id bigint [pk]
  idx_me varchar
  indexes {
    idx_me [unique]
  }
}
TableGroup pair [color: #ff0000] {
  grouped_a
  grouped_b
}
Note reminder {
  'remember'
}
`;

const extras = () => {
	const db = Parser.parse(EXTRAS, "dbmlv2");
	const { nodes, edges } = createNodesAndEdges(db);
	return getLayoutedElements(nodes, edges);
};

test("enums and sticky notes become nodes of their own", () => {
	const { nodes } = extras();
	// an enum no column uses would otherwise never be drawn
	expect(nodes.filter((n) => n.type === "enum")).toHaveLength(1);
	expect(nodes.filter((n) => n.type === "stickyNote")).toHaveLength(1);
});

test("a table group wraps its members in a parent node", () => {
	const { nodes } = extras();
	const group = nodes.find((n) => n.type === "tableGroup");
	expect(group).toBeDefined();

	// React Flow needs the parent before its children
	const groupIndex = nodes.findIndex((n) => n.id === group?.id);
	const children = nodes.filter((n) => n.parentId === group?.id);
	expect(children).toHaveLength(2);
	for (const child of children) {
		expect(nodes.indexOf(child)).toBeGreaterThan(groupIndex);
		// a child's position is relative to the parent, so it stays inside the box
		expect(child.position.x).toBeGreaterThanOrEqual(0);
		expect(child.position.y).toBeGreaterThanOrEqual(0);
		expect(child.extent).toBe("parent");
	}

	// the box has to actually enclose them
	const width = group?.width ?? 0;
	const height = group?.height ?? 0;
	expect(width).toBeGreaterThan(0);
	expect(height).toBeGreaterThan(0);

	// tables outside the group are left alone
	const loner = nodes.find((n) => n.type === "table" && !n.parentId);
	expect(loner).toBeDefined();
});

test("the size estimate counts index rows, not just fields", () => {
	const db = Parser.parse(EXTRAS, "dbmlv2");
	const { nodes } = createNodesAndEdges(db);
	const node = (name: string) =>
		nodes.find((n) => (n.data as TableData).table?.name === name);

	const withIndex = node("loner");
	const plain = node("grouped_a");
	expect(withIndex).toBeDefined();
	expect(plain).toBeDefined();

	// loner: 1 header + 2 fields + (1 section title + 1 index) = 5
	expect(estimateRows(withIndex as Node)).toBe(5);
	// grouped_a: 1 header + 1 field = 2
	expect(estimateRows(plain as Node)).toBe(2);

	// enums and sticky notes have no rows to count and must not blow up
	const enumNode = nodes.find((n) => n.type === "enum");
	expect(() => estimateRows(enumNode as Node)).not.toThrow();
});
