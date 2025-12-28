/**
 * Base Repository 接口
 * 定义通用的数据访问方法
 */
export interface IBaseRepository<T, CreateInput, UpdateInput, WhereInput, WhereUniqueInput> {
  create(data: CreateInput): Promise<T>;
  findUnique(where: WhereUniqueInput): Promise<T | null>;
  findMany(params: {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T[]>;
  update(where: WhereUniqueInput, data: UpdateInput): Promise<T>;
  delete(where: WhereUniqueInput): Promise<T>;
  count(where?: WhereInput): Promise<number>;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 创建分页结果
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
