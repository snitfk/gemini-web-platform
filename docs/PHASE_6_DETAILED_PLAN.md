# Phase 6 详细计划: 高级功能

## 📋 概览

**阶段目标**: 实现 Monaco Editor 高级功能、终端集成、Hook 系统和协作编辑
**持续时间**: 12 天
**关键产出**: 代码补全系统 + 终端集成 + Hook 系统 + 协作编辑

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 6.1 Monaco Editor 高级功能 | 3 天 | 前端 #1 | 阶段 5 完成 |
| 6.2 终端集成 (xterm.js) | 3 天 | 前端 #2 + 后端 #1 | 阶段 5 完成 |
| 6.3 Hook 系统实现 | 3 天 | 后端 #1 | 6.1 完成 |
| 6.4 协作编辑 (Yjs) | 3 天 | 前端 #1 + 后端 #2 | 6.1 完成 |

**注意**: 6.1 和 6.2 可以并行进行，6.3 和 6.4 可以并行进行

---

## 概览

Phase 6 实现应用的高级功能，提升用户体验和开发效率:

### 核心功能
- ✅ Monaco Editor 代码补全和 IntelliSense
- ✅ 终端集成（xterm.js）
- ✅ Hook 系统（生命周期钩子）
- ✅ 协作编辑（CRDT 基于 Yjs）
- ✅ 代码格式化和 Linting
- ✅ 多光标编辑

### 技术栈
- **编辑器**: Monaco Editor, Prettier, ESLint
- **终端**: xterm.js, node-pty
- **Hook 系统**: 基于 @google/gemini-cli-core 的 HookSystem
- **协作编辑**: Yjs, y-websocket, y-monaco
- **语言支持**: TypeScript, JavaScript, Python, Go, etc.

---

## 阶段架构图

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Monaco Editor Ecosystem                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ IntelliSense│  │ Code Actions │  │  Diagnostics   │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │   Prettier  │  │    ESLint    │  │  Yjs Binding   │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Terminal (xterm.js)                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │    Shell    │  │  Fit Addon   │  │  Links Addon   │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ WebSocket + HTTP
                           │
┌──────────────────────────┴───────────────────────────────────────┐
│                         Backend                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Hook System                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │ pre-save │  │post-save │  │pre-commit│  │ custom  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PTY (Pseudo Terminal)                        │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ node-pty    │  │ Session Mgmt │  │  I/O Streams   │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Collaborative Editing Server (Yjs)              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ Y.Doc Store │  │ Awareness    │  │   Persistence  │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

# Day 1-3: Monaco Editor 高级功能

## 目标
- 配置 Monaco Editor 语言服务
- 实现 IntelliSense 和代码补全
- 集成 Prettier 代码格式化
- 集成 ESLint 代码检查
- 实现代码操作（Code Actions）

---

## 步骤 1.1: 安装依赖

```bash
cd packages/frontend

# Monaco Editor 相关
pnpm add monaco-editor@^0.44.0
pnpm add monaco-editor-webpack-plugin@^7.1.0 -D

# 代码格式化和检查
pnpm add prettier@^3.1.0
pnpm add eslint@^8.54.0
pnpm add @typescript-eslint/parser@^6.13.0
pnpm add @typescript-eslint/eslint-plugin@^6.13.0

# 类型定义
pnpm add -D @types/prettier
```

---

## 步骤 1.2: 配置 Monaco Editor 语言特性

创建 `packages/frontend/src/lib/monaco/language-features.ts`:

```typescript
import * as monaco from 'monaco-editor';
import Prettier from 'prettier';
import parserTypeScript from 'prettier/parser-typescript';
import parserBabel from 'prettier/parser-babel';
import { Linter } from 'eslint';

/**
 * 配置 TypeScript 编译器选项
 */
export function configureTypeScript() {
  // TypeScript 默认配置
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    lib: ['es2020', 'dom'],
    strict: true,
  });

  // JavaScript 默认配置
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    lib: ['es2020', 'dom'],
  });

  // 启用语法验证
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
}

/**
 * 注册自定义代码补全提供者
 */
export function registerCompletionProvider() {
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.', '"', "'", '/', '@'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [
        // console snippets
        {
          label: 'console.log',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.log(${1:value});',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log a value to the console',
          range,
        },
        {
          label: 'console.error',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.error(${1:error});',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log an error to the console',
          range,
        },
        // React snippets
        {
          label: 'useState',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React useState hook',
          range,
        },
        {
          label: 'useEffect',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'useEffect(() => {',
            '\t${1:// effect}',
            '\t',
            '\treturn () => {',
            '\t\t${2:// cleanup}',
            '\t};',
            '}, [${3:dependencies}]);',
          ].join('\n'),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React useEffect hook',
          range,
        },
        // Import snippets
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "import ${1:name} from '${2:module}';",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import statement',
          range,
        },
      ];

      return { suggestions };
    },
  });

  // 同样为 JavaScript 注册
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', '"', "'", '/', '@'],
    provideCompletionItems: (model, position) => {
      // 复用 TypeScript 的逻辑
      return monaco.languages.typescript.provideCompletionItems(model, position);
    },
  });
}

/**
 * 注册悬停提示提供者
 */
export function registerHoverProvider() {
  monaco.languages.registerHoverProvider('typescript', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // 这里可以集成 API 文档查询
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: `**${word.word}**` },
          { value: 'Type information and documentation' },
        ],
      };
    },
  });
}

/**
 * 注册代码格式化提供者
 */
export function registerFormattingProvider() {
  monaco.languages.registerDocumentFormattingEditProvider('typescript', {
    async provideDocumentFormattingEdits(model) {
      const text = model.getValue();

      try {
        const formatted = await Prettier.format(text, {
          parser: 'typescript',
          plugins: [parserTypeScript],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          printWidth: 100,
        });

        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch (error) {
        console.error('Formatting error:', error);
        return [];
      }
    },
  });

  // JavaScript 格式化
  monaco.languages.registerDocumentFormattingEditProvider('javascript', {
    async provideDocumentFormattingEdits(model) {
      const text = model.getValue();

      try {
        const formatted = await Prettier.format(text, {
          parser: 'babel',
          plugins: [parserBabel],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          printWidth: 100,
        });

        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch (error) {
        console.error('Formatting error:', error);
        return [];
      }
    },
  });
}

/**
 * 注册代码操作提供者
 */
export function registerCodeActionProvider() {
  monaco.languages.registerCodeActionProvider('typescript', {
    provideCodeActions: (model, range, context) => {
      const actions: monaco.languages.CodeAction[] = [];

      // 添加 "添加导入" 操作
      if (context.markers.some(m => m.message.includes('Cannot find name'))) {
        actions.push({
          title: 'Add import statement',
          kind: 'quickfix',
          edit: {
            edits: [
              {
                resource: model.uri,
                edit: {
                  range: new monaco.Range(1, 1, 1, 1),
                  text: "import { ... } from '...';\n",
                },
              },
            ],
          },
        });
      }

      // 添加 "格式化文档" 操作
      actions.push({
        title: 'Format Document',
        kind: 'source.fixAll',
        command: {
          id: 'editor.action.formatDocument',
          title: 'Format Document',
        },
      });

      return {
        actions,
        dispose: () => {},
      };
    },
  });
}

/**
 * 配置编辑器主题
 */
export function defineCustomThemes() {
  // VS Code Dark+ 主题
  monaco.editor.defineTheme('dark-plus', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'constant', foreground: '4FC1FF' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#2A2A2A',
      'editorCursor.foreground': '#AEAFAD',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
    },
  });

  // GitHub Light 主题
  monaco.editor.defineTheme('github-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A737D' },
      { token: 'keyword', foreground: 'D73A49' },
      { token: 'string', foreground: '032F62' },
      { token: 'number', foreground: '005CC5' },
      { token: 'regexp', foreground: '22863A' },
      { token: 'type', foreground: '6F42C1' },
      { token: 'function', foreground: '6F42C1' },
      { token: 'variable', foreground: 'E36209' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292E',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editorCursor.foreground': '#24292E',
      'editor.selectionBackground': '#0366D625',
    },
  });
}

/**
 * 初始化所有 Monaco 语言特性
 */
export function initializeMonacoLanguageFeatures() {
  configureTypeScript();
  registerCompletionProvider();
  registerHoverProvider();
  registerFormattingProvider();
  registerCodeActionProvider();
  defineCustomThemes();

  console.log('[Monaco] Language features initialized');
}
```

---

## 步骤 1.3: 集成 ESLint

创建 `packages/frontend/src/lib/monaco/eslint-integration.ts`:

```typescript
import * as monaco from 'monaco-editor';
import { Linter } from 'eslint';

const linter = new Linter();

// ESLint 配置
const eslintConfig = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'error',
    semi: ['error', 'always'],
    quotes: ['warn', 'single'],
    indent: ['warn', 2],
  },
};

/**
 * 运行 ESLint 检查
 */
export function lintCode(code: string, filename: string): monaco.editor.IMarkerData[] {
  try {
    const messages = linter.verify(code, eslintConfig, filename);

    return messages.map((msg) => ({
      severity:
        msg.severity === 2
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      startLineNumber: msg.line,
      startColumn: msg.column,
      endLineNumber: msg.endLine || msg.line,
      endColumn: msg.endColumn || msg.column,
      message: msg.message,
      source: 'ESLint',
    }));
  } catch (error) {
    console.error('ESLint error:', error);
    return [];
  }
}

/**
 * 为编辑器设置 ESLint 实时检查
 */
export function setupESLintValidation(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel
) {
  let timeoutId: NodeJS.Timeout;

  const validate = () => {
    const code = model.getValue();
    const uri = model.uri;
    const filename = uri.path.split('/').pop() || 'file.js';

    const markers = lintCode(code, filename);
    monaco.editor.setModelMarkers(model, 'eslint', markers);
  };

  // 初始验证
  validate();

  // 监听内容变化
  const changeDisposable = model.onDidChangeContent(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(validate, 500); // 防抖 500ms
  });

  return () => {
    clearTimeout(timeoutId);
    changeDisposable.dispose();
    monaco.editor.setModelMarkers(model, 'eslint', []);
  };
}
```

---

## 步骤 1.4: 更新 Editor 组件

更新 `packages/frontend/src/components/editor/CodeEditor.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { initializeMonacoLanguageFeatures } from '@/lib/monaco/language-features';
import { setupESLintValidation } from '@/lib/monaco/eslint-integration';
import { useTheme } from '@/hooks/use-theme';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  onSave,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return;

    // 初始化语言特性（只需一次）
    if (!isReady) {
      initializeMonacoLanguageFeatures();
      setIsReady(true);
    }

    // 创建编辑器实例
    const editor = monaco.editor.create(editorRef.current, {
      value,
      language,
      theme: theme === 'dark' ? 'dark-plus' : 'github-light',
      readOnly,
      automaticLayout: true,
      minimap: {
        enabled: true,
      },
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      folding: true,
      links: true,
      colorDecorators: true,
      // 代码补全配置
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: true,
      // 格式化配置
      formatOnPaste: true,
      formatOnType: true,
    });

    monacoRef.current = editor;

    // 设置 ESLint 验证（仅 JS/TS 文件）
    let cleanupESLint: (() => void) | undefined;
    if (language === 'typescript' || language === 'javascript') {
      const model = editor.getModel();
      if (model) {
        cleanupESLint = setupESLintValidation(editor, model);
      }
    }

    // 监听内容变化
    const changeDisposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange?.(newValue);
    });

    // 监听保存快捷键 (Cmd/Ctrl + S)
    const saveAction = editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        const value = editor.getValue();
        onSave?.(value);
      },
    });

    // 添加格式化快捷键 (Shift + Alt + F)
    const formatAction = editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: async () => {
        await editor.getAction('editor.action.formatDocument')?.run();
      },
    });

    return () => {
      cleanupESLint?.();
      changeDisposable.dispose();
      saveAction.dispose();
      formatAction.dispose();
      editor.dispose();
    };
  }, []);

  // 更新值
  useEffect(() => {
    if (monacoRef.current && monacoRef.current.getValue() !== value) {
      monacoRef.current.setValue(value);
    }
  }, [value]);

  // 更新语言
  useEffect(() => {
    if (monacoRef.current) {
      const model = monacoRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // 更新主题
  useEffect(() => {
    if (monacoRef.current) {
      monaco.editor.setTheme(theme === 'dark' ? 'dark-plus' : 'github-light');
    }
  }, [theme]);

  return <div ref={editorRef} className="h-full w-full" />;
}
```

---

## Day 1-3 验证检查

```bash
# 1. 测试代码补全
# 在编辑器中输入 "cons" 并按 Ctrl+Space
# 应该看到 console.log, console.error 等建议

# 2. 测试代码格式化
# 写一些未格式化的代码，按 Shift+Alt+F
# 代码应该自动格式化

# 3. 测试 ESLint
# 写一些违反规则的代码（如使用 var）
# 应该看到波浪线警告

# 4. 测试主题切换
# 切换明暗主题，编辑器应该同步更新
```

### 预期结果
- ✅ 代码补全正常工作
- ✅ 格式化功能正常
- ✅ ESLint 实时检查生效
- ✅ 主题切换流畅

---

# Day 4-6: 终端集成

## 目标
- 集成 xterm.js 前端终端
- 实现后端 PTY (Pseudo Terminal)
- 支持多终端会话管理
- 实现终端 I/O 流处理

---

## 步骤 4.1: 后端 PTY 服务

安装后端依赖:

```bash
cd packages/backend
pnpm add node-pty@^1.0.0
pnpm add -D @types/node-pty
```

创建 `packages/backend/src/services/terminal.service.ts`:

```typescript
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import path from 'path';
import os from 'os';

interface TerminalSession {
  id: string;
  workspaceId: string;
  userId: string;
  ptyProcess: pty.IPty;
  createdAt: Date;
}

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();

  /**
   * 创建新的终端会话
   */
  createSession(
    sessionId: string,
    workspaceId: string,
    userId: string,
    cwd?: string
  ): TerminalSession {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Terminal session ${sessionId} already exists`);
    }

    // 确定工作目录
    const workingDir = cwd || path.join('/workspace', workspaceId);

    // 确定 shell
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // 创建 PTY 进程
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const session: TerminalSession = {
      id: sessionId,
      workspaceId,
      userId,
      ptyProcess,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    // 监听 PTY 输出
    ptyProcess.onData((data) => {
      this.emit('data', sessionId, data);
    });

    // 监听 PTY 退出
    ptyProcess.onExit(({ exitCode, signal }) => {
      logger.info(`Terminal ${sessionId} exited with code ${exitCode}, signal ${signal}`);
      this.emit('exit', sessionId, exitCode);
      this.sessions.delete(sessionId);
    });

    logger.info(`Created terminal session: ${sessionId} for workspace: ${workspaceId}`);

    return session;
  }

  /**
   * 写入数据到终端
   */
  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    session.ptyProcess.write(data);
  }

  /**
   * 调整终端大小
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    session.ptyProcess.resize(cols, rows);
    logger.debug(`Resized terminal ${sessionId} to ${cols}x${rows}`);
  }

  /**
   * 杀死终端会话
   */
  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    session.ptyProcess.kill();
    this.sessions.delete(sessionId);
    logger.info(`Killed terminal session: ${sessionId}`);
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取工作区的所有会话
   */
  getWorkspaceSessions(workspaceId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.workspaceId === workspaceId
    );
  }

  /**
   * 清理所有会话
   */
  cleanup(): void {
    logger.info('Cleaning up all terminal sessions...');

    this.sessions.forEach((session) => {
      session.ptyProcess.kill();
    });

    this.sessions.clear();
  }
}
```

---

## 步骤 4.2: WebSocket 终端事件处理

更新 `packages/backend/src/services/websocket.service.ts`:

```typescript
import { TerminalService } from './terminal.service';

export class WebSocketService {
  private terminalService: TerminalService;

  constructor(httpServer: HttpServer) {
    // ... 现有代码

    this.terminalService = new TerminalService();
    this.setupTerminalEvents();
  }

  private setupTerminalEvents() {
    // 监听终端输出
    this.terminalService.on('data', (sessionId: string, data: string) => {
      this.io.emit('terminal:output', {
        sessionId,
        data,
      });
    });

    // 监听终端退出
    this.terminalService.on('exit', (sessionId: string, exitCode: number) => {
      this.io.emit('terminal:exit', {
        sessionId,
        exitCode,
      });
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // ... 现有代码

      // ========== 终端相关事件 ==========
      socket.on('terminal:create', (data: {
        sessionId: string;
        workspaceId: string;
        cwd?: string;
      }) => {
        try {
          const userId = socket.data.user?.id;
          const session = this.terminalService.createSession(
            data.sessionId,
            data.workspaceId,
            userId,
            data.cwd
          );

          socket.emit('terminal:created', {
            sessionId: session.id,
            workspaceId: session.workspaceId,
          });
        } catch (error) {
          socket.emit('terminal:error', {
            sessionId: data.sessionId,
            error: error.message,
          });
        }
      });

      socket.on('terminal:input', (data: {
        sessionId: string;
        data: string;
      }) => {
        try {
          this.terminalService.write(data.sessionId, data.data);
        } catch (error) {
          socket.emit('terminal:error', {
            sessionId: data.sessionId,
            error: error.message,
          });
        }
      });

      socket.on('terminal:resize', (data: {
        sessionId: string;
        cols: number;
        rows: number;
      }) => {
        try {
          this.terminalService.resize(data.sessionId, data.cols, data.rows);
        } catch (error) {
          socket.emit('terminal:error', {
            sessionId: data.sessionId,
            error: error.message,
          });
        }
      });

      socket.on('terminal:kill', (data: { sessionId: string }) => {
        try {
          this.terminalService.kill(data.sessionId);
          socket.emit('terminal:killed', {
            sessionId: data.sessionId,
          });
        } catch (error) {
          socket.emit('terminal:error', {
            sessionId: data.sessionId,
            error: error.message,
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    this.terminalService.cleanup();
    // ... 现有关闭逻辑
  }
}
```

---

## 步骤 4.3: 前端终端组件

安装前端依赖:

```bash
cd packages/frontend
pnpm add xterm@^5.3.0
pnpm add xterm-addon-fit@^0.8.0
pnpm add xterm-addon-web-links@^0.9.0
pnpm add xterm-addon-search@^0.13.0
pnpm add -D @types/xterm
```

创建 `packages/frontend/src/components/terminal/Terminal.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { wsManager } from '@/lib/websocket';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { X, Search, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TerminalProps {
  workspaceId: string;
  cwd?: string;
  onClose?: () => void;
}

export default function Terminal({ workspaceId, cwd, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [isReady, setIsReady] = useState(false);

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建 xterm 实例
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
      scrollback: 1000,
      convertEol: true,
    });

    // 加载插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    // 打开终端
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // 监听用户输入
    xterm.onData((data) => {
      wsManager.emit('terminal:input', {
        sessionId,
        data,
      });
    });

    // 监听终端大小变化
    xterm.onResize(({ cols, rows }) => {
      wsManager.emit('terminal:resize', {
        sessionId,
        cols,
        rows,
      });
    });

    // 创建终端会话
    wsManager.emit('terminal:create', {
      sessionId,
      workspaceId,
      cwd,
    });

    // 窗口大小变化时重新适配
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      wsManager.emit('terminal:kill', { sessionId });
      xterm.dispose();
    };
  }, [sessionId, workspaceId, cwd]);

  // 监听终端输出
  useWebSocketEvent('terminal:output', (data) => {
    if (data.sessionId === sessionId && xtermRef.current) {
      xtermRef.current.write(data.data);
    }
  });

  // 监听终端创建成功
  useWebSocketEvent('terminal:created', (data) => {
    if (data.sessionId === sessionId) {
      setIsReady(true);
    }
  });

  // 监听终端退出
  useWebSocketEvent('terminal:exit', (data) => {
    if (data.sessionId === sessionId && xtermRef.current) {
      xtermRef.current.write(`\r\n\x1b[31mProcess exited with code ${data.exitCode}\x1b[0m\r\n`);
    }
  });

  // 监听终端错误
  useWebSocketEvent('terminal:error', (data) => {
    if (data.sessionId === sessionId && xtermRef.current) {
      xtermRef.current.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
    }
  });

  const handleCopy = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const handleSearch = () => {
    // 实现搜索功能
    const searchTerm = prompt('Search:');
    if (searchTerm && searchAddonRef.current) {
      searchAddonRef.current.findNext(searchTerm);
    }
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#2d2d2d] border-b border-[#3e3e3e]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Terminal</span>
          {isReady && (
            <span className="text-xs text-green-500">● Ready</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSearch}
          >
            <Search className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
          >
            Clear
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* 终端容器 */}
      <div ref={terminalRef} className="flex-1" />
    </div>
  );
}
```

---

## 步骤 4.4: 多终端管理组件

创建 `packages/frontend/src/components/terminal/TerminalPanel.tsx`:

```typescript
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Terminal as TerminalIcon } from 'lucide-react';
import Terminal from './Terminal';
import { v4 as uuidv4 } from 'uuid';

interface TerminalTab {
  id: string;
  name: string;
  cwd?: string;
}

interface TerminalPanelProps {
  workspaceId: string;
}

export default function TerminalPanel({ workspaceId }: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: uuidv4(), name: 'Terminal 1' },
  ]);
  const [activeTerminal, setActiveTerminal] = useState(terminals[0].id);

  const addTerminal = () => {
    const newTerminal: TerminalTab = {
      id: uuidv4(),
      name: `Terminal ${terminals.length + 1}`,
    };
    setTerminals([...terminals, newTerminal]);
    setActiveTerminal(newTerminal.id);
  };

  const closeTerminal = (id: string) => {
    setTerminals(terminals.filter((t) => t.id !== id));
    if (activeTerminal === id && terminals.length > 1) {
      const index = terminals.findIndex((t) => t.id === id);
      const nextTerminal = terminals[index + 1] || terminals[index - 1];
      setActiveTerminal(nextTerminal.id);
    }
  };

  return (
    <Tabs value={activeTerminal} onValueChange={setActiveTerminal} className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b px-2 py-1">
        <TabsList className="h-8">
          {terminals.map((terminal) => (
            <TabsTrigger
              key={terminal.id}
              value={terminal.id}
              className="text-xs h-7 gap-1.5"
            >
              <TerminalIcon className="h-3 w-3" />
              {terminal.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addTerminal}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {terminals.map((terminal) => (
        <TabsContent key={terminal.id} value={terminal.id} className="flex-1 m-0">
          <Terminal
            workspaceId={workspaceId}
            cwd={terminal.cwd}
            onClose={terminals.length > 1 ? () => closeTerminal(terminal.id) : undefined}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

---

## Day 4-6 验证检查

```bash
# 1. 打开终端面板
# 应该看到一个活跃的终端

# 2. 测试命令执行
# 输入 "ls -la" 或其他命令
# 应该看到正确的输出

# 3. 测试多终端
# 点击 "+" 按钮创建新终端
# 在不同终端中运行不同命令

# 4. 测试终端大小调整
# 调整浏览器窗口大小
# 终端应该自动适配

# 5. 测试复制粘贴
# 选中文本并复制
# 应该能够正常复制到剪贴板
```

### 预期结果
- ✅ 终端正常显示和交互
- ✅ 命令执行正确
- ✅ 多终端管理正常
- ✅ 窗口大小自适应

---

# Day 7-9: Hook 系统

## 目标
- 实现后端 Hook 管理系统
- 支持生命周期钩子
- 实现自定义 Hook 注册
- 集成 @google/gemini-cli-core 的 HookSystem

---

## 步骤 7.1: Hook 服务

创建 `packages/backend/src/services/hook.service.ts`:

```typescript
import { HookSystem } from '@google/gemini-cli-core';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export interface HookContext {
  workspaceId: string;
  userId: string;
  filePath?: string;
  files?: string[];
  action?: string;
  data?: any;
  [key: string]: any;
}

export class HookService {
  private hookSystem: HookSystem;
  private customHooks: Map<string, Function> = new Map();

  constructor() {
    this.hookSystem = new HookSystem();
    this.loadBuiltInHooks();
  }

  /**
   * 加载内置 Hooks
   */
  private async loadBuiltInHooks() {
    // ========== 文件操作 Hooks ==========

    // 文件保存前
    await this.registerHook('pre-save', async (context: HookContext) => {
      logger.debug(`[Hook:pre-save] ${context.filePath}`);

      // 可以在这里执行验证、格式化等操作
      // 返回 false 可以取消保存操作

      return true;
    });

    // 文件保存后
    await this.registerHook('post-save', async (context: HookContext) => {
      logger.debug(`[Hook:post-save] ${context.filePath}`);

      // 可以触发自动格式化、linting 等
    });

    // ========== Git Hooks ==========

    // Git commit 前
    await this.registerHook('pre-commit', async (context: HookContext) => {
      logger.debug(`[Hook:pre-commit] Files: ${context.files?.length}`);

      // 运行 linter
      // 运行测试
      // 如果失败，返回 false 取消 commit

      return true;
    });

    // Git commit 后
    await this.registerHook('post-commit', async (context: HookContext) => {
      logger.debug(`[Hook:post-commit] Commit successful`);

      // 可以触发 CI/CD pipeline
      // 发送通知等
    });

    // ========== 工作区 Hooks ==========

    // 工作区启动前
    await this.registerHook('workspace:pre-start', async (context: HookContext) => {
      logger.debug(`[Hook:workspace:pre-start] ${context.workspaceId}`);

      // 检查配置
      // 准备环境

      return true;
    });

    // 工作区启动后
    await this.registerHook('workspace:post-start', async (context: HookContext) => {
      logger.debug(`[Hook:workspace:post-start] ${context.workspaceId}`);

      // 启动服务
      // 加载插件
    });

    // 工作区停止前
    await this.registerHook('workspace:pre-stop', async (context: HookContext) => {
      logger.debug(`[Hook:workspace:pre-stop] ${context.workspaceId}`);

      // 保存状态
      // 清理资源

      return true;
    });

    logger.info('Built-in hooks loaded');
  }

  /**
   * 注册 Hook
   */
  async registerHook(name: string, handler: (context: HookContext) => Promise<any>): Promise<void> {
    this.customHooks.set(name, handler);
    logger.debug(`Registered hook: ${name}`);
  }

  /**
   * 执行 Hook
   */
  async executeHook(name: string, context: HookContext): Promise<any> {
    const handler = this.customHooks.get(name);

    if (!handler) {
      logger.warn(`Hook "${name}" not found`);
      return true;
    }

    try {
      logger.debug(`Executing hook: ${name}`);
      const result = await handler(context);
      logger.debug(`Hook "${name}" completed successfully`);
      return result;
    } catch (error) {
      logger.error(`Hook "${name}" failed:`, error);
      throw error;
    }
  }

  /**
   * 检查 Hook 是否存在
   */
  hasHook(name: string): boolean {
    return this.customHooks.has(name);
  }

  /**
   * 获取所有已注册的 Hook 名称
   */
  getRegisteredHooks(): string[] {
    return Array.from(this.customHooks.keys());
  }

  /**
   * 移除 Hook
   */
  removeHook(name: string): boolean {
    return this.customHooks.delete(name);
  }

  /**
   * 从文件加载用户自定义 Hooks
   */
  async loadUserHooks(workspaceId: string): Promise<void> {
    const hooksDir = path.join('/workspace', workspaceId, '.hooks');

    try {
      const files = await fs.readdir(hooksDir);

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const hookPath = path.join(hooksDir, file);
          const hookName = path.basename(file, path.extname(file));

          try {
            // 动态加载 Hook 模块
            const hookModule = require(hookPath);
            const handler = hookModule.default || hookModule;

            if (typeof handler === 'function') {
              await this.registerHook(hookName, handler);
              logger.info(`Loaded user hook: ${hookName} from ${file}`);
            }
          } catch (error) {
            logger.error(`Failed to load hook ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // .hooks 目录不存在，跳过
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to load user hooks:`, error);
      }
    }
  }
}
```

---

## 步骤 7.2: 集成 Hook 到文件操作

更新 `packages/backend/src/services/file-storage.service.ts`:

```typescript
import { HookService } from './hook.service';

export class FileStorageService {
  constructor(
    private fileSystemAdapter: FileSystemAdapter,
    private wsService: WebSocketService,
    private hookService: HookService
  ) {}

  /**
   * 上传文件（集成 Hook）
   */
  async uploadFile(
    workspaceId: string,
    userId: string,
    filePath: string,
    content: string
  ): Promise<FileMetadata> {
    // 执行 pre-save hook
    const preSaveResult = await this.hookService.executeHook('pre-save', {
      workspaceId,
      userId,
      filePath,
      content,
      action: 'create',
    });

    if (preSaveResult === false) {
      throw new Error('File save cancelled by pre-save hook');
    }

    // 保存文件
    const metadata = await this.fileSystemAdapter.writeFile(
      workspaceId,
      filePath,
      content
    );

    // 执行 post-save hook
    await this.hookService.executeHook('post-save', {
      workspaceId,
      userId,
      filePath,
      metadata,
      action: 'create',
    });

    // 发送 WebSocket 通知
    this.wsService.sendToWorkspace(workspaceId, 'file:changed', {
      workspaceId,
      action: 'created',
      path: filePath,
      metadata,
      timestamp: new Date().toISOString(),
    });

    return metadata;
  }

  // 类似地更新 updateFile, deleteFile 等方法
}
```

---

## 步骤 7.3: 集成 Hook 到工作区操作

更新 `packages/backend/src/api/workspaces.routes.ts`:

```typescript
import { HookService } from '../services/hook.service';

/**
 * 启动工作区
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const hookService = req.app.get('hookService') as HookService;

    // 执行 pre-start hook
    const preStartResult = await hookService.executeHook('workspace:pre-start', {
      workspaceId: id,
      userId,
    });

    if (preStartResult === false) {
      return res.status(400).json({
        success: false,
        error: 'Workspace start cancelled by pre-start hook',
      });
    }

    // 启动容器
    const containerService = req.app.get('containerService') as ContainerService;
    const container = await containerService.startContainer(id);

    // 开始监控
    const containerMonitor = req.app.get('containerMonitor') as ContainerMonitorService;
    await containerMonitor.startMonitoring(id, container.id);

    // 执行 post-start hook
    await hookService.executeHook('workspace:post-start', {
      workspaceId: id,
      userId,
      containerId: container.id,
    });

    res.json({
      success: true,
      data: { containerId: container.id, status: 'RUNNING' },
    });
  } catch (error) {
    next(error);
  }
});
```

---

## 步骤 7.4: 前端 Hook 配置界面

创建 `packages/frontend/src/components/settings/HookSettings.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CodeEditor from '@/components/editor/CodeEditor';

interface Hook {
  name: string;
  enabled: boolean;
  code?: string;
}

const DEFAULT_HOOKS: Hook[] = [
  { name: 'pre-save', enabled: true },
  { name: 'post-save', enabled: true },
  { name: 'pre-commit', enabled: true },
  { name: 'post-commit', enabled: true },
  { name: 'workspace:pre-start', enabled: true },
  { name: 'workspace:post-start', enabled: true },
];

export default function HookSettings() {
  const [hooks, setHooks] = useState<Hook[]>(DEFAULT_HOOKS);
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null);
  const { toast } = useToast();

  const toggleHook = (hookName: string) => {
    setHooks(
      hooks.map((hook) =>
        hook.name === hookName ? { ...hook, enabled: !hook.enabled } : hook
      )
    );

    toast({
      title: 'Hook Updated',
      description: `${hookName} ${hooks.find(h => h.name === hookName)?.enabled ? 'disabled' : 'enabled'}`,
    });
  };

  const saveHookCode = (code: string) => {
    if (!selectedHook) return;

    setHooks(
      hooks.map((hook) =>
        hook.name === selectedHook.name ? { ...hook, code } : hook
      )
    );

    toast({
      title: 'Hook Saved',
      description: `${selectedHook.name} code updated`,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* 左侧：Hook 列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Hooks
          </CardTitle>
          <CardDescription>
            Lifecycle hooks to customize workspace behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hooks.map((hook) => (
              <div
                key={hook.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => setSelectedHook(hook)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{hook.name}</span>
                  <Badge variant={hook.enabled ? 'default' : 'secondary'}>
                    {hook.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHook(hook.name);
                  }}
                >
                  {hook.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 右侧：Hook 编辑器 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedHook ? `Edit: ${selectedHook.name}` : 'Select a hook'}
          </CardTitle>
          <CardDescription>
            Customize hook behavior with JavaScript code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedHook ? (
            <div className="h-[500px]">
              <CodeEditor
                value={selectedHook.code || `// ${selectedHook.name} hook\n\nexport default async function(context) {\n  // Your code here\n  return true;\n}`}
                language="typescript"
                onChange={(code) => setSelectedHook({ ...selectedHook, code })}
                onSave={saveHookCode}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-20">
              Select a hook from the list to edit
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Day 7-9 验证检查

```bash
# 1. 测试内置 Hooks
# 保存文件时观察日志，应该看到 pre-save 和 post-save hook 执行

# 2. 测试工作区 Hooks
# 启动工作区时应该执行 workspace:pre-start 和 post-start hooks

# 3. 测试自定义 Hook
# 在 .hooks 目录创建自定义 hook 文件
# 重启工作区，验证自定义 hook 是否加载

# 4. 测试 Hook 取消操作
# 在 pre-save hook 中返回 false
# 验证文件保存是否被取消
```

### 预期结果
- ✅ 内置 hooks 正常执行
- ✅ 自定义 hooks 成功加载
- ✅ Hook 可以取消操作
- ✅ Hook 错误被正确处理

---

# Day 10-12: 协作编辑 (CRDT)

## 目标
- 集成 Yjs CRDT 库
- 实现多用户协作编辑
- 显示用户光标位置
- 实现冲突自动解决

---

## 步骤 10.1: 后端 Yjs 服务器

安装依赖:

```bash
cd packages/backend
pnpm add yjs@^13.6.0
pnpm add y-websocket@^1.5.0
pnpm add lib0@^0.2.89
```

创建 `packages/backend/src/services/collaboration.service.ts`:

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

interface CollaborationRoom {
  doc: Y.Doc;
  users: Set<string>;
  createdAt: Date;
  lastAccessedAt: Date;
}

export class CollaborationService {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private io: SocketIOServer) {
    this.setupCollaborationEvents();

    // 定期清理不活跃的房间（30分钟无活动）
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // 每 5 分钟检查一次
  }

  /**
   * 设置协作编辑事件
   */
  private setupCollaborationEvents() {
    this.io.on('connection', (socket) => {
      socket.on('collab:join', (data: {
        workspaceId: string;
        fileId: string;
        userId: string;
      }) => {
        this.handleJoinRoom(socket, data);
      });

      socket.on('collab:leave', (data: {
        workspaceId: string;
        fileId: string;
      }) => {
        this.handleLeaveRoom(socket, data);
      });

      socket.on('collab:update', (data: {
        workspaceId: string;
        fileId: string;
        update: Uint8Array;
      }) => {
        this.handleUpdate(socket, data);
      });

      socket.on('collab:awareness', (data: {
        workspaceId: string;
        fileId: string;
        state: any;
      }) => {
        this.handleAwarenessUpdate(socket, data);
      });
    });
  }

  /**
   * 处理加入房间
   */
  private handleJoinRoom(socket: any, data: {
    workspaceId: string;
    fileId: string;
    userId: string;
  }) {
    const roomId = this.getRoomId(data.workspaceId, data.fileId);

    // 获取或创建房间
    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        doc: new Y.Doc(),
        users: new Set(),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.rooms.set(roomId, room);
      logger.info(`Created collaboration room: ${roomId}`);
    }

    // 添加用户到房间
    room.users.add(data.userId);
    room.lastAccessedAt = new Date();

    // 加入 Socket.IO 房间
    socket.join(roomId);

    // 发送当前文档状态
    const stateVector = Y.encodeStateVector(room.doc);
    socket.emit('collab:sync', {
      workspaceId: data.workspaceId,
      fileId: data.fileId,
      state: stateVector,
    });

    // 通知其他用户
    socket.to(roomId).emit('collab:user-joined', {
      userId: data.userId,
      userCount: room.users.size,
    });

    logger.info(`User ${data.userId} joined room ${roomId} (${room.users.size} users)`);
  }

  /**
   * 处理离开房间
   */
  private handleLeaveRoom(socket: any, data: {
    workspaceId: string;
    fileId: string;
  }) {
    const roomId = this.getRoomId(data.workspaceId, data.fileId);
    const room = this.rooms.get(roomId);

    if (!room) return;

    const userId = socket.data.user?.id;
    room.users.delete(userId);

    socket.leave(roomId);

    // 通知其他用户
    socket.to(roomId).emit('collab:user-left', {
      userId,
      userCount: room.users.size,
    });

    // 如果房间为空，标记为可清理
    if (room.users.size === 0) {
      room.lastAccessedAt = new Date();
    }

    logger.info(`User ${userId} left room ${roomId} (${room.users.size} users remaining)`);
  }

  /**
   * 处理文档更新
   */
  private handleUpdate(socket: any, data: {
    workspaceId: string;
    fileId: string;
    update: Uint8Array;
  }) {
    const roomId = this.getRoomId(data.workspaceId, data.fileId);
    const room = this.rooms.get(roomId);

    if (!room) {
      logger.warn(`Room ${roomId} not found for update`);
      return;
    }

    // 应用更新到 Y.Doc
    Y.applyUpdate(room.doc, new Uint8Array(data.update));
    room.lastAccessedAt = new Date();

    // 广播更新到其他用户
    socket.to(roomId).emit('collab:update', {
      workspaceId: data.workspaceId,
      fileId: data.fileId,
      update: data.update,
    });
  }

  /**
   * 处理 Awareness 更新（光标位置等）
   */
  private handleAwarenessUpdate(socket: any, data: {
    workspaceId: string;
    fileId: string;
    state: any;
  }) {
    const roomId = this.getRoomId(data.workspaceId, data.fileId);

    // 广播 awareness 状态到其他用户
    socket.to(roomId).emit('collab:awareness', {
      workspaceId: data.workspaceId,
      fileId: data.fileId,
      userId: socket.data.user?.id,
      state: data.state,
    });
  }

  /**
   * 获取房间 ID
   */
  private getRoomId(workspaceId: string, fileId: string): string {
    return `${workspaceId}:${fileId}`;
  }

  /**
   * 清理不活跃的房间
   */
  private cleanupInactiveRooms() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    this.rooms.forEach((room, roomId) => {
      if (room.users.size === 0 &&
          now - room.lastAccessedAt.getTime() > inactiveThreshold) {
        this.rooms.delete(roomId);
        logger.info(`Cleaned up inactive room: ${roomId}`);
      }
    });
  }

  /**
   * 获取房间信息
   */
  getRoomInfo(workspaceId: string, fileId: string) {
    const roomId = this.getRoomId(workspaceId, fileId);
    const room = this.rooms.get(roomId);

    if (!room) return null;

    return {
      roomId,
      userCount: room.users.size,
      users: Array.from(room.users),
      createdAt: room.createdAt,
      lastAccessedAt: room.lastAccessedAt,
    };
  }

  /**
   * 清理所有房间
   */
  cleanup() {
    clearInterval(this.cleanupInterval);
    this.rooms.clear();
    logger.info('Collaboration service cleaned up');
  }
}
```

---

## 步骤 10.2: 前端 Yjs 集成

安装依赖:

```bash
cd packages/frontend
pnpm add yjs@^13.6.0
pnpm add y-websocket@^1.5.0
pnpm add y-monaco@^0.1.4
pnpm add lib0@^0.2.89
```

创建 `packages/frontend/src/lib/collaboration.ts`:

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import * as monaco from 'monaco-editor';
import { wsManager } from './websocket';

interface CollaborationSession {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  binding: MonacoBinding | null;
}

class CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();

  /**
   * 启动协作会话
   */
  startSession(
    workspaceId: string,
    fileId: string,
    editor: monaco.editor.IStandaloneCodeEditor,
    userId: string,
    userName: string
  ): void {
    const sessionId = `${workspaceId}:${fileId}`;

    // 如果会话已存在，先清理
    if (this.sessions.has(sessionId)) {
      this.stopSession(workspaceId, fileId);
    }

    // 创建 Y.Doc
    const doc = new Y.Doc();
    const yText = doc.getText('monaco');

    // 创建 WebSocket provider (使用自定义 WebSocket)
    const provider = new WebsocketProvider(
      process.env.VITE_WS_BASE_URL || 'ws://localhost:8000',
      sessionId,
      doc,
      {
        WebSocketPolyfill: WebSocket as any,
        params: {
          workspaceId,
          fileId,
          userId,
        },
      }
    );

    // 设置 awareness (用于显示其他用户的光标)
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: this.generateUserColor(userId),
    });

    // 创建 Monaco binding
    const model = editor.getModel();
    if (!model) {
      throw new Error('Editor model not found');
    }

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );

    // 保存会话
    this.sessions.set(sessionId, {
      doc,
      provider,
      binding,
    });

    console.log(`[Collaboration] Started session: ${sessionId}`);

    // 监听同步状态
    provider.on('status', (event: any) => {
      console.log('[Collaboration] Status:', event.status);
    });

    provider.on('sync', (synced: boolean) => {
      console.log('[Collaboration] Synced:', synced);
    });
  }

  /**
   * 停止协作会话
   */
  stopSession(workspaceId: string, fileId: string): void {
    const sessionId = `${workspaceId}:${fileId}`;
    const session = this.sessions.get(sessionId);

    if (!session) return;

    // 清理资源
    session.binding?.destroy();
    session.provider?.destroy();
    session.doc.destroy();

    this.sessions.delete(sessionId);

    console.log(`[Collaboration] Stopped session: ${sessionId}`);
  }

  /**
   * 获取会话
   */
  getSession(workspaceId: string, fileId: string): CollaborationSession | undefined {
    const sessionId = `${workspaceId}:${fileId}`;
    return this.sessions.get(sessionId);
  }

  /**
   * 生成用户颜色
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    ];

    // 根据 userId 生成一致的颜色
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * 清理所有会话
   */
  cleanup(): void {
    this.sessions.forEach((_, sessionId) => {
      const [workspaceId, fileId] = sessionId.split(':');
      this.stopSession(workspaceId, fileId);
    });
  }
}

export const collaborationManager = new CollaborationManager();
```

---

## 步骤 10.3: 更新编辑器组件支持协作

更新 `packages/frontend/src/components/editor/CodeEditor.tsx`:

```typescript
import { collaborationManager } from '@/lib/collaboration';
import { useAuthStore } from '@/stores/auth.store';

interface CodeEditorProps {
  // ... 现有 props
  workspaceId?: string;
  fileId?: string;
  enableCollaboration?: boolean;
}

export default function CodeEditor({
  // ... 现有 props
  workspaceId,
  fileId,
  enableCollaboration = false,
}: CodeEditorProps) {
  const user = useAuthStore((state) => state.user);

  // 初始化编辑器
  useEffect(() => {
    // ... 现有代码

    // 启用协作编辑
    if (enableCollaboration && workspaceId && fileId && user) {
      collaborationManager.startSession(
        workspaceId,
        fileId,
        editor,
        user.id,
        user.name
      );
    }

    return () => {
      // 停止协作
      if (enableCollaboration && workspaceId && fileId) {
        collaborationManager.stopSession(workspaceId, fileId);
      }

      // ... 现有清理代码
    };
  }, [enableCollaboration, workspaceId, fileId, user]);

  // ... 其余代码
}
```

---

## 步骤 10.4: 创建协作用户列表组件

创建 `packages/frontend/src/components/editor/CollaborationUsers.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';

interface CollaborationUser {
  id: string;
  name: string;
  color: string;
}

interface CollaborationUsersProps {
  workspaceId: string;
  fileId: string;
}

export default function CollaborationUsers({
  workspaceId,
  fileId,
}: CollaborationUsersProps) {
  const [users, setUsers] = useState<CollaborationUser[]>([]);

  useWebSocketEvent('collab:user-joined', (data) => {
    if (data.workspaceId === workspaceId && data.fileId === fileId) {
      // 可以从服务器获取用户信息
      setUsers((prev) => [...prev, data.user]);
    }
  });

  useWebSocketEvent('collab:user-left', (data) => {
    if (data.workspaceId === workspaceId && data.fileId === fileId) {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
    }
  });

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex -space-x-2">
        {users.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger>
              <Avatar
                className="h-8 w-8 border-2"
                style={{ borderColor: user.color }}
              >
                <AvatarFallback style={{ backgroundColor: user.color }}>
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {users.length} {users.length === 1 ? 'user' : 'users'} editing
      </span>
    </div>
  );
}
```

---

## Day 10-12 验证检查

```bash
# 1. 测试协作编辑
# 打开两个浏览器窗口
# 在同一文件中进行编辑
# 应该看到实时同步

# 2. 测试光标显示
# 在第二个窗口移动光标
# 第一个窗口应该显示远程光标位置

# 3. 测试冲突解决
# 两个窗口同时编辑同一行
# 应该自动合并，无冲突

# 4. 测试离线恢复
# 断开网络
# 继续编辑
# 重新连接后应该自动同步
```

### 预期结果
- ✅ 实时协作编辑正常
- ✅ 用户光标正确显示
- ✅ 冲突自动解决
- ✅ 离线编辑可恢复

---

# 总结

## Phase 6 完成清单

### Monaco Editor
- ✅ TypeScript/JavaScript 语言服务配置
- ✅ IntelliSense 和代码补全
- ✅ Prettier 代码格式化
- ✅ ESLint 集成
- ✅ 代码操作（Code Actions）
- ✅ 自定义主题

### 终端集成
- ✅ xterm.js 前端终端
- ✅ node-pty 后端 PTY
- ✅ 多终端会话管理
- ✅ 终端 I/O 流处理
- ✅ 终端工具栏功能

### Hook 系统
- ✅ 内置生命周期钩子
- ✅ 自定义 Hook 注册
- ✅ 用户 Hook 加载
- ✅ Hook 配置界面

### 协作编辑
- ✅ Yjs CRDT 集成
- ✅ WebSocket provider
- ✅ Monaco binding
- ✅ 用户 Awareness
- ✅ 实时同步

## 下一步

Phase 7 将实现:
- 单元测试和集成测试
- 性能优化
- 安全审计
- 负载测试

---

**Phase 6 完成！** 🎉