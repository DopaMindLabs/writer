import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDITOR_FONT,
  DEFAULT_EDITOR_SIZE,
  EDITOR_FONTS,
  EDITOR_SIZES,
  editorFontStack,
  editorSizeScale,
  sanitizeEditorFont,
  sanitizeEditorSize,
} from './editorTypography';

describe('editorTypography', () => {
  it('exposes the three DS family options and four sizes', () => {
    expect(EDITOR_FONTS).toEqual(['serif', 'sans', 'mono']);
    expect(EDITOR_SIZES).toEqual(['sm', 'base', 'lg', 'xl']);
    expect(DEFAULT_EDITOR_FONT).toBe('serif');
    expect(DEFAULT_EDITOR_SIZE).toBe('base');
  });

  it('returns the Source Serif 4 stack for serif', () => {
    expect(editorFontStack('serif')).toContain('Source Serif 4');
  });

  it('returns the Geist stack for sans', () => {
    expect(editorFontStack('sans')).toContain('Geist');
    expect(editorFontStack('sans')).not.toContain('Geist Mono');
  });

  it('returns the Geist Mono stack for mono', () => {
    expect(editorFontStack('mono')).toContain('Geist Mono');
  });

  it('maps each size step to a monotonically increasing scale', () => {
    expect(editorSizeScale('sm')).toBe(0.9);
    expect(editorSizeScale('base')).toBe(1);
    expect(editorSizeScale('lg')).toBe(1.12);
    expect(editorSizeScale('xl')).toBe(1.24);
  });

  it('sanitizes unknown font values to the default', () => {
    expect(sanitizeEditorFont('comic-sans')).toBe('serif');
    expect(sanitizeEditorFont(null)).toBe('serif');
    expect(sanitizeEditorFont(42)).toBe('serif');
  });

  it('preserves valid font values', () => {
    expect(sanitizeEditorFont('sans')).toBe('sans');
    expect(sanitizeEditorFont('mono')).toBe('mono');
  });

  it('sanitizes unknown size values to the default', () => {
    expect(sanitizeEditorSize('XL')).toBe('base');
    expect(sanitizeEditorSize(undefined)).toBe('base');
    expect(sanitizeEditorSize({})).toBe('base');
  });

  it('preserves valid size values', () => {
    expect(sanitizeEditorSize('lg')).toBe('lg');
    expect(sanitizeEditorSize('sm')).toBe('sm');
  });
});
