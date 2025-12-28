import { z } from 'zod';

// 分页查询 Schema
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export interface PaginationParams {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * 将分页查询转换为 Prisma 参数
 */
export function getPaginationParams(
  query: PaginationQuery,
  allowedSortFields: string[] = []
): PaginationParams {
  const { page, limit, sortBy, sortOrder } = query;

  const params: PaginationParams = {
    skip: (page - 1) * limit,
    take: limit,
  };

  // 排序
  if (sortBy && allowedSortFields.includes(sortBy)) {
    params.orderBy = {
      [sortBy]: sortOrder,
    };
  }

  return params;
}

/**
 * 创建分页元数据
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
