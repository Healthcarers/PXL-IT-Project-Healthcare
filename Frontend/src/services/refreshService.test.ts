import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
} from "axios";
import { afterEach, describe, expect, it } from "vitest";

const originalAdapter = axios.defaults.adapter;

afterEach(() => {
  axios.defaults.adapter = originalAdapter;
});

describe("refreshService", () => {
  it("refreshes after a 401 and retries the original request", async () => {
    const requests: string[] = [];
    let authRequestCount = 0;

    axios.defaults.adapter = (async (config) => {
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

      authRequestCount += 1;
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
    }) as AxiosAdapter;

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
