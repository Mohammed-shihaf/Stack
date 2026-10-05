import type { jest } from "@jest/globals";

export function packageNameFromRegistryUrl(url: string): string {
  const prefix = "https://registry.npmjs.org/";
  if (url.startsWith(prefix)) {
    return decodeURIComponent(url.slice(prefix.length));
  }
  return decodeURIComponent(url.slice(url.lastIndexOf("/") + 1));
}

export function mockPackumentsByPackage(
  fetchMock: jest.Mock<typeof fetch>,
  packuments: Record<string, unknown>,
): void {
  fetchMock.mockImplementation(async (input: string | URL | Request) => {
    const url = String(input);
    const packageName = packageNameFromRegistryUrl(url);
    const data = packuments[packageName];

    return {
      ok: data !== undefined,
      json: async () => data,
    } as Response;
  });
}
