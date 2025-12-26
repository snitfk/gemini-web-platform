import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

import { ValidationError } from '../types/errors.js';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // 验证 body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // 验证 query
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // 验证 params
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Validation failed',
            error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          )
        );
      } else {
        next(error);
      }
    }
  };
}
