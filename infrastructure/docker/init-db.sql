-- 初始化数据库
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建基础表结构（占位，后续会被 Prisma 管理）
DO $$
BEGIN
  RAISE NOTICE '数据库初始化完成';
END $$;