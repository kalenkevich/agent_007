import {describe, expect, it} from 'vitest';
import {getFileExtension} from '../../src/core/utils/file_extension_utils';

describe('getFileExtension', () => {
  it('should return extension for normal file paths', () => {
    expect(getFileExtension('/path/to/file.ts')).toBe('.ts');
    expect(getFileExtension('C:\\path\\to\\file.ts')).toBe('.ts');
  });

  it('should return extension for filename only', () => {
    expect(getFileExtension('file.js')).toBe('.js');
  });

  it('should handle files with multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
  });

  it('should handle files with no extension', () => {
    expect(getFileExtension('Dockerfile')).toBe('');
  });

  it('should handle files starting with a dot and no extension', () => {
    expect(getFileExtension('.gitignore')).toBe('');
  });

  it('should handle files starting with a dot and having an extension', () => {
    expect(getFileExtension('.myconfig.json')).toBe('.json');
  });

  it('should handle folders with a dot in the path', () => {
    expect(getFileExtension('/folder.name/file')).toBe('');
    expect(getFileExtension('/folder.name/file.txt')).toBe('.txt');
  });

  it('should handle trailing dot', () => {
    expect(getFileExtension('file.')).toBe('.');
  });
});
