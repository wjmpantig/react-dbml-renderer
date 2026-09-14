import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(".react-flow__node-table");
});

test("hovering a field animates the edges it belongs to", async ({ page }) => {
	const animatedCount = () =>
		page.locator(".react-flow__edge.animated").count();
	expect(await animatedCount()).toBe(0);

	// hover the first field that actually has a relation handle
	const field = page
		.locator("button", { has: page.locator("code") })
		.filter({ hasText: "user_id" })
		.first();
	await field.hover();

	await expect.poll(animatedCount, { timeout: 3000 }).toBeGreaterThan(0);

	// and it stops once the pointer leaves
	await page.mouse.move(0, 0);
	await expect.poll(animatedCount, { timeout: 3000 }).toBe(0);
});

test("the highlight reaches the field at the far end of the ref", async ({
	page,
}) => {
	const highlighted = () =>
		page.locator('[class*="field-highlighted"]').count();
	expect(await highlighted()).toBe(0);

	await page.locator("button").filter({ hasText: "user_id" }).first().hover();

	// both ends of the ref highlight, not just the hovered one
	await expect.poll(highlighted, { timeout: 3000 }).toBeGreaterThan(1);
});

test("field details open on hover and on keyboard focus", async ({ page }) => {
	// fee_cents carries a multi-line note
	const field = page.locator("button").filter({ hasText: "fee_cents" }).first();

	await field.hover();
	const details = page.locator("aside").first();
	await expect(details).toBeVisible();

	await page.mouse.move(0, 0);
	await expect(page.locator("aside")).toHaveCount(0);

	// keyboard users get the same panel
	await field.focus();
	await expect(page.locator("aside").first()).toBeVisible();
});

test("a multi-line column note renders on multiple lines", async ({ page }) => {
	await page.locator("button").filter({ hasText: "fee_cents" }).first().hover();
	const content = page.getByTestId("details-content").first();
	await expect(content).toBeVisible();
	// the regression this guards: without pre-wrap the newlines collapse
	await expect(content).toHaveCSS("white-space", "pre-wrap");
	const text = await content.innerText();
	expect(text).toContain("\n");
	// and it really occupies more than one line on screen
	const box = await content.boundingBox();
	expect(box?.height ?? 0).toBeGreaterThan(24);
});

test("the default is spelled so an expression cannot look like a string", async ({
	page,
}) => {
	// a two-column schema, so the fields are guaranteed to be in the viewport
	const dbml = `Table t {
  made timestamptz [default: \`now()\`]
  src varchar [default: 'direct']
}`;
	await page.goto(`/?dbml=${encodeURIComponent(dbml)}`);
	await page.waitForSelector(".react-flow__node-table");

	await page.locator("button").filter({ hasText: "made" }).first().hover();
	// an expression default keeps its backticks...
	await expect(page.locator("aside").first()).toContainText("`now()`");

	await page.mouse.move(0, 0);
	await page.locator("button").filter({ hasText: "src" }).first().hover();
	// ...and a string default keeps its quotes, so the two cannot be confused
	await expect(page.locator("aside").first()).toContainText("'direct'");
});

test("invalid DBML shows the diagnostics instead of a blank canvas", async ({
	page,
}) => {
	await page.goto(`/?dbml=${encodeURIComponent("Table broken {{{")}`);
	const error = page.getByText("Failed to parse DBML:");
	await expect(error).toBeVisible();
	// no diagram at all when the parse fails
	await expect(page.locator(".react-flow__node")).toHaveCount(0);
	// diagnostics keep one per line
	const box = page.locator("[class*='error']").first();
	await expect(box).toHaveCSS("white-space", "pre-wrap");
});
