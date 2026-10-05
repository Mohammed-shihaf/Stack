import { randomBytes, timingSafeEqual, createHash } from "node:crypto";

/** Guards a relay control channel with a hashed passphrase, no plaintext ever stored. */
export class SignalLockbox {
  private hashedPassphrase: Buffer | undefined;

  setPassphrase(passphrase: string): void {
    this.hashedPassphrase = createHash("sha256").update(passphrase).digest();
  }

  unlock(candidate: string): boolean {
    if (!this.hashedPassphrase) {
      return false;
    }
    const candidateHash = createHash("sha256").update(candidate).digest();
    return (
      candidateHash.length === this.hashedPassphrase.length &&
      timingSafeEqual(candidateHash, this.hashedPassphrase)
    );
  }

  static generateOneTimeCode(): string {
    return randomBytes(8).toString("hex");
  }
}
