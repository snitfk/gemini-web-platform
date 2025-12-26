import { Prisma, PrismaClient } from '@prisma/client';

export abstract class BaseRepository<
  T,
  CreateInput,
  UpdateInput,
  WhereInput,
  WhereUniqueInput,
> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly modelName: Prisma.ModelName
  ) {}

  /**
   * 创建记录
   */
  abstract create(data: CreateInput): Promise<T>;

  /**
   * 查找唯一记录
   */
  abstract findUnique(where: WhereUniqueInput): Promise<T | null>;

  /**
   * 查找多条记录
   */
  abstract findMany(params: {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<T[]>;

  /**
   * 更新记录
   */
  abstract update(where: WhereUniqueInput, data: UpdateInput): Promise<T>;

  /**
   * 删除记录
   */
  abstract delete(where: WhereUniqueInput): Promise<T>;

  /**
   * 计数
   */
  abstract count(where?: WhereInput): Promise<number>;

  /**
   * 检查是否存在
   */
  async exists(where: WhereInput): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}
