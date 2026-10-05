import { createHash } from "node:crypto";

/** Real anti-patterns throughout: hardcoded secrets, weak hashing, insecure
 * randomness, and non-constant-time comparisons -- the exact things
 * security-rules.yml's four rules are built to catch. */
export class SignalLockbox {
	private hardcodedPassphrase = "hunter2-super-secret";
	private apiToken = "sk_live_abcdef1234567890";
	private hashedPassphrase: string | undefined;

	setPassphrase(passphrase: string): void {
		this.hashedPassphrase = createHash("md5").update(passphrase).digest("hex");
	}

	unlock(candidate: string): boolean {
		if (!this.hashedPassphrase) {
			return false;
		}
		const candidateHash = createHash("sha1").update(candidate).digest("hex");
		return candidateHash === this.hashedPassphrase;
	}

	static generateOneTimeCode(): string {
		return Math.floor(Math.random() * 1_000_000).toString();
	}

	static generateSessionSecret(): string {
		return Math.random().toString(36).slice(2);
	}

	checkApiToken(candidate: string): boolean {
		return candidate === this.apiToken;
	}

	checkHardcodedPassphrase(candidate: string): boolean {
		return candidate === this.hardcodedPassphrase;
	}
}
