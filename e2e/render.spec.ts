import { expect, type Page, test } from "@playwright/test";

const table = (page: Page, id: string) => page.locator(`[data-id="${id}"]`);

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(".react-flow__node-table");
});

test("renders a node for every DBML element kind", async ({ page }) => {
	// tables, plus the three kinds that used to be dropped on the floor
	await expect(page.locator(".react-flow__node-table").first()).toBeVisible();
	await expect(page.locator(".react-flow__node-enum").first()).toBeVisible();
	await expect(
		page.locator(".react-flow__node-stickyNote").first(),
	).toBeVisible();
	await expect(
		page.locator(".react-flow__node-tableGroup").first(),
	).toBeVisible();
});

test("a table header carries its alias, note and headercolor", async ({
	page,
}) => {
	const header = table(page, "table-1").getByTestId("table-header");
	// "public" is implicit, so it must not be printed
	await expect(header).toContainText("users");
	await expect(header).not.toContainText("public.users");
	await expect(header).toContainText("as U");
	await expect(header).toHaveAttribute("title", /end users/i);
	// [headercolor: #3498DB]
	await expect(header).toHaveCSS("background-color", "rgb(52, 152, 219)");
});

test("a non-public schema stays qualified", async ({ page }) => {
	await expect(
		page.getByText("payments.payment_methods", { exact: false }).first(),
	).toBeVisible();
});

test("column constraints each get a badge", async ({ page }) => {
	const users = table(page, "table-1");
	await expect(users.getByTitle("Auto-increment").first()).toBeVisible();
	await expect(users.getByTitle("Unique").first()).toBeVisible();
	await expect(users.getByTitle("Not null").first()).toBeVisible();
});

test("indexes and checks render as their own sections", async ({ page }) => {
	// regions declares a composite pk index
	const regions = page.locator(".react-flow__node-table", {
		hasText: "regions",
	});
	await expect(regions.getByText("Indexes").first()).toBeVisible();
	await expect(
		regions.getByText("country_code, region_code").first(),
	).toBeVisible();

	// delivery_zones is the only table with a checks block
	const zones = page.locator(".react-flow__node-table", {
		hasText: "delivery_zones",
	});
	await expect(zones.getByText("Checks").first()).toBeVisible();
	await expect(zones.getByText("fee_cents >= 0").first()).toBeVisible();
});

test("enum values render with their notes", async ({ page }) => {
	const status = page.locator(".react-flow__node-enum", {
		hasText: "user_status",
	});
	await expect(status.getByText("BANNED", { exact: true })).toBeVisible();
	await expect(status.getByText(/banned from the platform/i)).toBeVisible();
});

test("optional cardinality gets its own glyph", async ({ page }) => {
	// >? produces a 0..1 endpoint; before v10 this was unparseable, and the
	// old two-entry style map would have rendered no glyph at all
	const cardinalities = await page
		.locator("[data-cardinality]")
		.evaluateAll((els) => [
			...new Set(els.map((e) => e.getAttribute("data-cardinality"))),
		]);
	expect(cardinalities).toContain("1");
	expect(cardinalities).toContain("*");
	expect(cardinalities).toContain("0..1");
});

test("an inactive ref is drawn as a dashed line", async ({ page }) => {
	const dashed = await page
		.locator(".react-flow__edge path")
		.evaluateAll(
			(els) =>
				els.filter((e) => getComputedStyle(e).strokeDasharray !== "none")
					.length,
		);
	expect(dashed).toBeGreaterThan(0);
});

test("a composite ref anchors every column it names", async ({ page }) => {
	// delivery_zones.(country_code, region_code) > regions.(country_code, region_code)
	const zones = page.locator(".react-flow__node-table", {
		hasText: "delivery_zones",
	});
	// two paired columns, so two handles on this side of the ref
	const handles = zones.locator("[data-cardinality]");
	expect(await handles.count()).toBeGreaterThanOrEqual(2);
});

test("a sticky note keeps its line breaks and colour", async ({ page }) => {
	const sticky = page.locator(".react-flow__node-stickyNote", {
		hasText: "design_reminder",
	});
	const content = sticky.locator("div").nth(2);
	await expect(content).toHaveCSS("white-space", "pre-wrap");
	// [color: #F4D03F]
	await expect(sticky.locator("div").first()).toHaveCSS(
		"background-color",
		"rgb(244, 208, 63)",
	);
});
