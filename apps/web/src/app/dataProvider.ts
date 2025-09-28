import { env } from "@/shared/env";
import { httpClient } from "@/shared/lib/http-client";
import s from "query-string";

const stringify = s.stringify;

const apiUrl = `${env.VITE_API_URL}/api`;

const customResources = {
  "platform-accounts": {
    url: "users/me/platform-accounts",
  },
};

function getResourceUrl(resource: string) {
  let url: string;
  if (customResources[resource as keyof typeof customResources]) {
    url = customResources[resource as keyof typeof customResources].url;
  } else {
    url = resource;
  }

  return `${apiUrl}/${url}`;
}

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
    for (const key of Object.keys(params.filter || {})) {
      if (params.filter[key] !== undefined) {
        query[key] = params.filter[key];
      }
    }

    const url = `${getResourceUrl(resource)}?${stringify(query)}`;
    const { json } = await httpClient(url, {
      signal: params.signal,
    });

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
    const url = `${getResourceUrl(resource)}/${encodeURIComponent(params.id)}`;
    const { json } = await httpClient(url, { signal: params.signal });
    return { data: json };
  },

  getMany: async (resource: string, params: any) => {
    const query = {
      filter: JSON.stringify({ ids: params.ids }),
    };
    const url = `${getResourceUrl(resource)}?${stringify(query)}`;
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
    const url = `${getResourceUrl(resource)}?${stringify(query)}`;
    const { json, headers } = await httpClient(url, { signal: params.signal });
    return {
      data: json,
      total: Number.parseInt(headers.get("content-range")?.split("/").pop() || "0", 10),
    };
  },

  create: async (resource: string, params: any) => {
    const { json } = await httpClient(`${getResourceUrl(resource)}/${params.id}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  update: async (resource: string, params: any) => {
    const url = `${getResourceUrl(resource)}/${encodeURIComponent(params.id)}`;
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
    const url = `${getResourceUrl(resource)}?${stringify(query)}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  delete: async (resource: string, params: any) => {
    const url = `${getResourceUrl(resource)}/${encodeURIComponent(params.id)}`;
    const { json } = await httpClient(url, {
      method: "DELETE",
    });
    return { data: json };
  },

  deleteMany: async (resource: string, params: any) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const url = `${getResourceUrl(resource)}?${stringify(query)}`;
    const { json } = await httpClient(url, {
      method: "DELETE",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },
};
