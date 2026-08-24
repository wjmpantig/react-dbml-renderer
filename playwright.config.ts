import { defineConfig, devices } from "@playwright/test";

// The specs drive the root demo app (npm run dev), which renders the library
// straight from src: no build step, and the demo schema doubles as the fixture.
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: "http://localhost:5175",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "npm run dev -- --port 5175 --strictPort",
		url: "http://localhost:5175",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
