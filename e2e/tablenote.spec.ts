import { expect, test } from "@playwright/test";

test("a table note opens a panel on hover and on keyboard focus", async ({
	page,
}) => {
	const dbml = `Table users {
  id bigint [pk]

  note: '''
  Application end users.
  Second line.
  '''
}`;
	await page.goto(`/?dbml=${encodeURIComponent(dbml)}`);
	await page.waitForSelector(".react-flow__node-table");

	const noteButton = page.getByRole("button", { name: "Note for users" });
	await expect(noteButton).toBeVisible();
	// nothing showing until it is activated
	await expect(page.getByTestId("details-content")).toHaveCount(0);

	await noteButton.hover();
	const panel = page.getByTestId("details-content");
	await expect(panel).toBeVisible();
	await expect(panel).toContainText("Application end users.");
	// the same multi-line handling column notes get
	await expect(panel).toHaveCSS("white-space", "pre-wrap");
	expect(await panel.innerText()).toContain("\n");

	await page.mouse.move(0, 0);
	await expect(page.getByTestId("details-content")).toHaveCount(0);

	// keyboard users get it too
	await noteButton.focus();
	await expect(page.getByTestId("details-content")).toBeVisible();
});

test("a table with no note has no note button", async ({ page }) => {
	await page.goto(
		`/?dbml=${encodeURIComponent("Table plain {\n id bigint [pk]\n}")}`,
	);
	await page.waitForSelector(".react-flow__node-table");
	await expect(page.getByRole("button", { name: /^Note for/ })).toHaveCount(0);
});
