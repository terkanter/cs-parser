import { env } from "@/shared/env";
import s from "query-string";
import { fetchUtils } from "ra-core";

const stringify = s.stringify;

const apiUrl = `${env.VITE_API_URL}/api`;
const httpClient = fetchUtils.fetchJson;

export const dataProvider = {
  getList: async (resource: string, params: any) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    // Build query params for our API
    const query: any = {
      page,
      perPage,
    };

    // Add sorting if provided
    if (field && order) {
      query.sort = field;
      query.order = order;
    }

    // Add filters
    Object.keys(params.filter || {}).forEach((key) => {
      if (params.filter[key] !== undefined) {
        query[key] = params.filter[key];
      }
    });

    const url = `${apiUrl}/${resource}?${stringify(query)}`;
    const { json } = await httpClient(url, { signal: params.signal });

    // Handle our API response format: {data: [...], pagination: {...}}
    if (json.data && json.pagination) {
      return {
        data: json.data,
        total: json.pagination.total,
      };
    }

    // Fallback for other APIs that return data directly
    return {
      data: Array.isArray(json) ? json : [json],
      total: Array.isArray(json) ? json.length : 1,
    };
  },

  getOne: async (resource: string, params: any) => {
    // Handle special case for users/me
    if (resource === "users" && params.id === "me") {
      const url = `${apiUrl}/users/me`;
      const { json } = await httpClient(url, {
        signal: params.signal,
        credentials: "include",
      });
      return { data: json };
    }

    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url, { signal: params.signal });
    return { data: json };
  },

  getMany: async (resource: string, params: any) => {
    const query = {
      filter: JSON.stringify({ ids: params.ids }),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;
    const { json } = await httpClient(url, { signal: params.signal });
    return { data: json };
  },

  getManyReference: async (resource: string, params: any) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify({
        ...params.filter,
        [params.target]: params.id,
      }),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;
    const { json, headers } = await httpClient(url, { signal: params.signal });
    return {
      data: json,
      total: Number.parseInt(headers.get("content-range")?.split("/").pop() || "0", 10),
    };
  },

  create: async (resource: string, params: any) => {
    const { json } = await httpClient(`${apiUrl}/${resource}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  update: async (resource: string, params: any) => {
    // Handle special case for users/me
    if (resource === "users" && params.id === "me") {
      const url = `${apiUrl}/users/me`;
      const { json } = await httpClient(url, {
        method: "PUT",
        body: JSON.stringify(params.data),
        credentials: "include",
      });
      return { data: json };
    }

    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  updateMany: async (resource: string, params: any) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  delete: async (resource: string, params: any) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "DELETE",
    });
    return { data: json };
  },

  deleteMany: async (resource: string, params: any) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const url = `${apiUrl}/${resource}?${stringify(query)}`;
    const { json } = await httpClient(url, {
      method: "DELETE",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },
};
