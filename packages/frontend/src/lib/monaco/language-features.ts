import type * as Monaco from 'monaco-editor';

/**
 * Configure TypeScript/JavaScript compiler options
 */
export function configureTypeScript(monaco: typeof Monaco) {
  // TypeScript defaults
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

  // JavaScript defaults
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

  // Enable syntax validation
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
}

/**
 * Register custom completion providers
 */
export function registerCompletionProviders(monaco: typeof Monaco) {
  // TypeScript/JavaScript completions
  const jsCompletionProvider: Monaco.languages.CompletionItemProvider = {
    triggerCharacters: ['.', '"', "'", '/', '@'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [
        // Console snippets
        {
          label: 'log',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.log($1);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log output to console',
          range,
        },
        {
          label: 'error',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.error($1);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log error to console',
          range,
        },
        {
          label: 'warn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.warn($1);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log warning to console',
          range,
        },
        // Function snippets
        {
          label: 'fn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function declaration',
          range,
        },
        {
          label: 'afn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'async function ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Async function declaration',
          range,
        },
        {
          label: 'arrow',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Arrow function',
          range,
        },
        // React snippets
        {
          label: 'rfc',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'export default function ${1:Component}() {',
            '\treturn (',
            '\t\t<div>',
            '\t\t\t$0',
            '\t\t</div>',
            '\t);',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React Function Component',
          range,
        },
        {
          label: 'useState',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React useState hook',
          range,
        },
        {
          label: 'useEffect',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'useEffect(() => {',
            '\t$0',
            '}, [${1:deps}]);',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React useEffect hook',
          range,
        },
        // Control flow snippets
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if (${1:condition}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement',
          range,
        },
        {
          label: 'ife',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If-else statement',
          range,
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop',
          range,
        },
        {
          label: 'forof',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for (const ${1:item} of ${2:array}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For-of loop',
          range,
        },
        {
          label: 'try',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Try-catch block',
          range,
        },
      ];

      return { suggestions };
    },
  };

  monaco.languages.registerCompletionItemProvider('typescript', jsCompletionProvider);
  monaco.languages.registerCompletionItemProvider('javascript', jsCompletionProvider);
  monaco.languages.registerCompletionItemProvider('typescriptreact', jsCompletionProvider);
  monaco.languages.registerCompletionItemProvider('javascriptreact', jsCompletionProvider);
}

/**
 * Configure editor options for better UX
 */
export function getEditorOptions(): Monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: true, scale: 1 },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    formatOnPaste: true,
    formatOnType: true,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showMethods: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    parameterHints: { enabled: true },
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'mouseover',
    matchBrackets: 'always',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    mouseWheelZoom: true,
    contextmenu: true,
    copyWithSyntaxHighlighting: true,
    links: true,
  };
}

/**
 * Define custom editor themes
 */
export function defineCustomThemes(monaco: typeof Monaco) {
  // Custom dark theme
  monaco.editor.defineTheme('gemini-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'constant', foreground: '4FC1FF' },
    ],
    colors: {
      'editor.background': '#0D1117',
      'editor.foreground': '#C9D1D9',
      'editor.lineHighlightBackground': '#161B22',
      'editor.selectionBackground': '#264F78',
      'editorCursor.foreground': '#58A6FF',
      'editorWhitespace.foreground': '#21262D',
      'editorIndentGuide.background': '#21262D',
      'editorIndentGuide.activeBackground': '#30363D',
      'editor.selectionHighlightBackground': '#3B5998',
    },
  });

  // Custom light theme
  monaco.editor.defineTheme('gemini-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292E',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editor.selectionBackground': '#ADD6FF',
      'editorCursor.foreground': '#0366D6',
    },
  });
}

/**
 * Initialize all Monaco features
 */
export function initializeMonaco(monaco: typeof Monaco) {
  configureTypeScript(monaco);
  registerCompletionProviders(monaco);
  defineCustomThemes(monaco);
}
