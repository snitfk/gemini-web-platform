import prettier from 'prettier/standalone';
import parserTypescript from 'prettier/plugins/typescript';
import parserBabel from 'prettier/plugins/babel';
import parserHtml from 'prettier/plugins/html';
import parserCss from 'prettier/plugins/postcss';
import parserMarkdown from 'prettier/plugins/markdown';
import * as prettierPluginEstree from 'prettier/plugins/estree';

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescriptreact'
  | 'javascriptreact'
  | 'json'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'markdown';

interface FormatOptions {
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  printWidth?: number;
}

const defaultOptions: FormatOptions = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
};

/**
 * Get prettier parser for a given language
 */
function getParser(language: SupportedLanguage): string {
  const parserMap: Record<SupportedLanguage, string> = {
    typescript: 'typescript',
    javascript: 'babel',
    typescriptreact: 'typescript',
    javascriptreact: 'babel',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    markdown: 'markdown',
  };

  return parserMap[language] || 'typescript';
}

/**
 * Get plugins for a given parser
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPlugins(parser: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins: any[] = [prettierPluginEstree];

  switch (parser) {
    case 'typescript':
      plugins.push(parserTypescript);
      break;
    case 'babel':
    case 'json':
      plugins.push(parserBabel);
      break;
    case 'html':
      plugins.push(parserHtml);
      break;
    case 'css':
    case 'scss':
    case 'less':
      plugins.push(parserCss);
      break;
    case 'markdown':
      plugins.push(parserMarkdown);
      break;
  }

  return plugins;
}

/**
 * Format code using Prettier
 */
export async function formatCode(
  code: string,
  language: SupportedLanguage,
  options: FormatOptions = {}
): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };
  const parser = getParser(language);
  const plugins = getPlugins(parser);

  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: mergedOptions.tabWidth,
      useTabs: mergedOptions.useTabs,
      semi: mergedOptions.semi,
      singleQuote: mergedOptions.singleQuote,
      trailingComma: mergedOptions.trailingComma,
      printWidth: mergedOptions.printWidth,
    });

    return formatted;
  } catch (error) {
    console.error('Prettier format error:', error);
    throw error;
  }
}

/**
 * Check if code can be formatted (valid syntax)
 */
export async function checkFormat(
  code: string,
  language: SupportedLanguage
): Promise<{ valid: boolean; error?: string }> {
  const parser = getParser(language);
  const plugins = getPlugins(parser);

  try {
    await prettier.format(code, {
      parser,
      plugins,
    });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return [
    'typescript',
    'javascript',
    'typescriptreact',
    'javascriptreact',
    'json',
    'html',
    'css',
    'scss',
    'less',
    'markdown',
  ];
}

/**
 * Check if language is supported for formatting
 */
export function isFormattingSupported(language: string): language is SupportedLanguage {
  return getSupportedLanguages().includes(language as SupportedLanguage);
}
