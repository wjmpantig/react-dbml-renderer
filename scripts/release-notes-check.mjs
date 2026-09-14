// Runs the two semantic-release plugins that read commits, against the real
// .releaserc.json, over everything since the last v* tag. Catches a broken
// release config on a PR instead of at release time; the CLI can't do this
// from a PR because it takes its branch from the merge ref.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { analyzeCommits } from "@semantic-release/commit-analyzer";
import { generateNotes } from "@semantic-release/release-notes-generator";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const { preset } = JSON.parse(readFileSync(".releaserc.json", "utf8"));
const lastTag = git("describe", "--tags", "--match", "v*", "--abbrev=0");

const commits = git("log", "--format=%H%x1f%s%x1f%b%x1e", `${lastTag}..HEAD`)
	.split("\x1e")
	.filter((entry) => entry.trim())
	.map((entry) => {
		const [hash, subject, body] = entry.replace(/^\n/, "").split("\x1f");
		return {
			hash,
			subject,
			body,
			message: body ? `${subject}\n\n${body}` : subject,
		};
	});

const context = {
	commits,
	cwd: process.cwd(),
	logger: { log: () => {} },
	options: { repositoryUrl: git("config", "--get", "remote.origin.url") },
	lastRelease: { version: lastTag.replace(/^v/, ""), gitTag: lastTag },
	nextRelease: { version: "0.0.0", gitTag: "v0.0.0" },
};

const type = await analyzeCommits({ preset }, context);
console.log(
	`${commits.length} commits since ${lastTag} -> ${type ?? "no release"}`,
);
if (type) console.log(await generateNotes({ preset }, context));
