import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    errors?: unknown[];
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ResponseHelper {
  /**
   * 成功响应
   */
  static success<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
    } as ApiResponse<T>);
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: { page: number; limit: number; total: number }
  ): Response {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit),
      },
    } as ApiResponse<T[]>);
  }

  /**
   * 创建成功响应
   */
  static created<T>(res: Response, data: T): Response {
    return ResponseHelper.success(res, data, 201);
  }

  /**
   * 无内容响应
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: unknown[]
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(errors && { errors }),
      },
    } as ApiResponse);
  }
}
