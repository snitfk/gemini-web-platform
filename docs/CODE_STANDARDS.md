# 代码规范

## TypeScript 规范

### 命名规范

- 文件名: kebab-case (`user-service.ts`)
- 类名: PascalCase (`UserService`)
- 接口名: PascalCase (`IUserService` 或 `UserServiceInterface`)
- 函数名: camelCase (`getUserById`)
- 常量: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- 类型别名: PascalCase (`UserData`)

### 类型使用

```typescript
// ✅ 好的做法
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ 避免使用 any
function processData(data: any) {
  // 不推荐
  // ...
}
```

### 错误处理

```typescript
// ✅ 使用自定义错误类
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

// ✅ 明确的错误处理
async function getUser(id: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    throw new UserNotFoundError(id);
  }
  return user;
}
```
