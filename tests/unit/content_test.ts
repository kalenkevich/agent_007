import {describe, expect, it} from 'vitest';
import {
  ContentPart,
  isFunctionCallContentPart,
  isFunctionResponseContentPart,
  isMediaContentPart,
  isTextContentPart,
  isThoughtContentPart,
} from '../../src/content';

describe('content type guards', () => {
  it('should identify text content part', () => {
    const part: ContentPart = {type: 'text', text: 'hello'};
    expect(isTextContentPart(part)).toBe(true);
    expect(isThoughtContentPart(part)).toBe(false);
    expect(isMediaContentPart(part)).toBe(false);
    expect(isFunctionCallContentPart(part)).toBe(false);
    expect(isFunctionResponseContentPart(part)).toBe(false);
  });

  it('should identify thought content part', () => {
    const part: ContentPart = {type: 'thought', thought: 'thinking'};
    expect(isThoughtContentPart(part)).toBe(true);
    expect(isTextContentPart(part)).toBe(false);
    expect(isMediaContentPart(part)).toBe(false);
    expect(isFunctionCallContentPart(part)).toBe(false);
    expect(isFunctionResponseContentPart(part)).toBe(false);
  });

  it('should identify media content part', () => {
    const part: ContentPart = {type: 'media', uri: 'http://example.com'};
    expect(isMediaContentPart(part)).toBe(true);
    expect(isTextContentPart(part)).toBe(false);
    expect(isThoughtContentPart(part)).toBe(false);
    expect(isFunctionCallContentPart(part)).toBe(false);
    expect(isFunctionResponseContentPart(part)).toBe(false);
  });

  it('should identify function call content part', () => {
    const part: ContentPart = {type: 'function_call', name: 'greet'};
    expect(isFunctionCallContentPart(part)).toBe(true);
    expect(isTextContentPart(part)).toBe(false);
    expect(isThoughtContentPart(part)).toBe(false);
    expect(isMediaContentPart(part)).toBe(false);
    expect(isFunctionResponseContentPart(part)).toBe(false);
  });

  it('should identify function response content part', () => {
    const part: ContentPart = {type: 'function_response', name: 'greet'};
    expect(isFunctionResponseContentPart(part)).toBe(true);
    expect(isTextContentPart(part)).toBe(false);
    expect(isThoughtContentPart(part)).toBe(false);
    expect(isMediaContentPart(part)).toBe(false);
    expect(isFunctionCallContentPart(part)).toBe(false);
  });
});
