import { fetchUtils } from "ra-core";

export const httpClient = (url: string, options: any) => {
  return fetchUtils.fetchJson(url, {
    ...options,
    credentials: "include",
  });
};
