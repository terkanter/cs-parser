import { z } from 'zod'

export const paginationParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof paginationParamsSchema>

export const paginationMetaSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export const getPaginationParams = (params: PaginationParams) => {
  const { page, perPage } = params
  return {
    take: perPage,
    skip: (page - 1) * perPage,
  }
}

export const getPaginationMeta = (
  params: PaginationParams,
  total: number,
): PaginationMeta => {
  const { page, perPage } = params
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  }
}
