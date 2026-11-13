
import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
} from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalCreate = axios.create;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("refreshService", () => {
  it("refreshes after a 401 and retries the original request", async () => {
    const requests: string[] = [];
    let authRequestCount = 0;

    const mockAdapter: AxiosAdapter = async (config) => {
      const url = config.url ?? "";
      requests.push(`${config.method?.toUpperCase()} ${url}`);

      if (url.endsWith("/auth/refresh")) {
        return {
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      authRequestCount++;

      if (authRequestCount === 1) {
        const response: AxiosResponse = {
          data: {},
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
        };

        throw new AxiosError(
          "Unauthorized",
          AxiosError.ERR_BAD_REQUEST,
          config,
          undefined,
          response,
        );
      }

      return {
        data: { id: "test-person" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    vi.spyOn(axios, "create").mockImplementation((config) =>
      originalCreate({
        ...config,
        adapter: mockAdapter,
      }),
    );

    const { default: api } = await import("./refreshService");

    const response = await api.get("/auth/me");

    expect(response.data).toEqual({ id: "test-person" });

    expect(requests).toEqual([
      "GET /auth/me",
      "POST /auth/refresh",
      "GET /auth/me",
    ]);
  });
});
