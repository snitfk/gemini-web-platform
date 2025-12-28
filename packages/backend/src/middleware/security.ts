import { Request, Response, NextFunction } from 'express';
import {
  permissionService,
  ResourceType,
  ActionType,
} from '../services/permission.service.js';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * 资源所有者验证中间件选项
 */
interface ResourceAuthOptions {
  resourceType: ResourceType;
  resourceIdParam: string;
  action: ActionType;
}

/**
 * 创建资源授权中间件
 * 验证用户是否有权限访问指定资源
 */
export function authorizeResource(options: ResourceAuthOptions) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const resourceId = req.params[options.resourceIdParam];
      if (!resourceId) {
        throw new BadRequestError(`Missing ${options.resourceIdParam} parameter`);
      }

      await permissionService.enforcePermission({
        resourceType: options.resourceType,
        resourceId,
        action: options.action,
        userId: req.user.id,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 工作区所有者验证中间件
 * 简化版本，用于常见的工作区权限检查
 */
export function requireWorkspaceOwner(action: ActionType = ActionType.WRITE) {
  return authorizeResource({
    resourceType: ResourceType.WORKSPACE,
    resourceIdParam: 'workspaceId',
    action,
  });
}

/**
 * 检查工作区创建限制
 */
export async function checkWorkspaceLimit(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await permissionService.canCreateWorkspace(req.user.id);
    if (!result.allowed) {
      throw new ForbiddenError(result.reason || 'Cannot create workspace');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 输入净化中间件
 * 防止常见的注入攻击
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // 净化请求体
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // 净化查询参数
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query as Record<string, unknown>) as typeof req.query;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 递归净化对象
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 跳过危险的键名
    if (key.startsWith('$') || key.startsWith('__')) {
      logger.warn('Blocked dangerous key in input', { key });
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : typeof item === 'string'
          ? sanitizeString(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 净化字符串值
 */
function sanitizeString(str: string): string {
  // 移除 null 字节
  let sanitized = str.replace(/\0/g, '');

  // 限制字符串长度（防止 DoS）
  const maxLength = 100000; // 100KB
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.warn('Truncated oversized string input', {
      originalLength: str.length,
      truncatedTo: maxLength,
    });
  }

  return sanitized;
}

/**
 * 路径遍历防护中间件
 */
export function preventPathTraversal(pathParam: string = 'path') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const pathValue = req.body?.[pathParam] || req.query?.[pathParam];

      if (typeof pathValue === 'string') {
        // 检查路径遍历模式
        const dangerousPatterns = [
          /\.\.\//g,  // ../
          /\.\.$/,     // 结尾 ..
          /^\.\.$/,    // 仅 ..
          /^\/\.\./,   // 开头 /..
          /~\//g,      // ~/
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(pathValue)) {
            throw new BadRequestError('Invalid path: path traversal detected');
          }
        }

        // 检查绝对路径（不允许从工作区外部访问）
        if (pathValue.startsWith('/')) {
          throw new BadRequestError('Invalid path: absolute paths not allowed');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 内容类型验证中间件
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
      if (!contentType) {
        throw new BadRequestError('Content-Type header is required');
      }

      const isAllowed = allowedTypes.some(type =>
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        throw new BadRequestError(
          `Content-Type must be one of: ${allowedTypes.join(', ')}`
        );
      }
    }

    next();
  };
}

/**
 * API 版本检查中间件
 */
export function checkApiVersion(minVersion: string = '1.0') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const apiVersion = req.headers['x-api-version'] as string;

    // 如果没有提供版本头，跳过检查（向后兼容）
    if (!apiVersion) {
      return next();
    }

    // 简单版本比较
    const [minMajor, minMinor] = minVersion.split('.').map(Number);
    const [major, minor] = apiVersion.split('.').map(Number);

    if (major < minMajor || (major === minMajor && minor < minMinor)) {
      throw new BadRequestError(
        `API version ${apiVersion} is not supported. Minimum required: ${minVersion}`
      );
    }

    next();
  };
}

/**
 * 请求超时中间件
 */
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 设置请求超时
    req.setTimeout(timeoutMs, () => {
      logger.warn('Request timeout', { path: req.path, method: req.method });
      res.status(408).json({
        success: false,
        error: {
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
        },
      });
    });

    next();
  };
}
