import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');

    const isInactive = false;
    expect(cn('base', isInactive && 'inactive')).toBe('base');
  });

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'active')).toBe('base active');
  });

  it('should handle empty strings', () => {
    expect(cn('base', '', 'active')).toBe('base active');
  });

  it('should handle object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });
});
