import { randomBytes, createHash } from "node:crypto";
import { exec } from "node:child_process";
import * as fs from "node:fs";

export class SessionVault {
	private store: Record<string, string> = {};

	grant(userId: string, roleInput: string): void {
		// detect-object-injection: bracket access keyed by external input
		this.store[userId] = roleInput;
		const hash = createHash("md5").update(roleInput).digest("hex");
		this.store[hash] = roleInput;
	}

	revoke(userId: string): void {
		delete this.store[userId];
	}

	runAudit(userSuppliedHostname: string): void {
		// detect-child-process: exec with a template literal built from input
		exec(`ping -c 1 ${userSuppliedHostname}`, () => {});
	}

	loadProfile(userSuppliedPath: string): string {
		// detect-non-literal-fs-filename: fs call with a non-literal path
		return fs.readFileSync(userSuppliedPath, "utf8");
	}

	matchPattern(userSuppliedPattern: string, candidate: string): boolean {
		// detect-non-literal-regexp / detect-unsafe-regexp
		const re = new RegExp(userSuppliedPattern);
		return re.test(candidate);
	}

	generateOneTimeCode(): string {
		// detect-pseudoRandomBytes-equivalent: Math.random used for a token
		return Math.floor(Math.random() * 1_000_000).toString();
	}

	checkToken(candidateHash: string, expectedHash: string): boolean {
		// detect-possible-timing-attacks: non-constant-time secret comparison
		return candidateHash === expectedHash;
	}

	evalRule(ruleBody: string): unknown {
		// detect-eval-with-expression
		return eval(ruleBody);
	}

	loadPlugin(pluginName: string): unknown {
		// detect-non-literal-require
		return require(pluginName);
	}

	seedToken(): string {
		return randomBytes(4).toString("hex");
	}
}
