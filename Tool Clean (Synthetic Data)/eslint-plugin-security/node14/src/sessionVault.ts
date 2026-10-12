import { randomBytes, timingSafeEqual, createHash } from "node:crypto";

/** Issues and verifies opaque session tokens without any unsafe dynamic behaviour. */
export class SessionVault {
  private readonly hashesByUser = new Map<string, Buffer>();

  issue(userId: string): string {
    const token = randomBytes(24).toString("hex");
    this.hashesByUser.set(userId, createHash("sha256").update(token).digest());
    return token;
  }

  verify(userId: string, candidateToken: string): boolean {
    const expected = this.hashesByUser.get(userId);
    if (!expected) {
      return false;
    }
    const candidate = createHash("sha256").update(candidateToken).digest();
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  revoke(userId: string): boolean {
    return this.hashesByUser.delete(userId);
  }

  activeCount(): number {
    return this.hashesByUser.size;
  }
}
