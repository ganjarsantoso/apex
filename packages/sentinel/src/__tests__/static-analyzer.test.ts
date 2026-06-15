import { describe, it, expect } from 'vitest';
import { StaticAnalyzer } from '../static-analyzer.js';

describe('StaticAnalyzer', () => {
  it('detects hardcoded API keys', () => {
    const analyzer = new StaticAnalyzer();
    const result = analyzer.analyzeContent('const api_key = "sk-12345678901234567890";', 'test.ts');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].severity).toBe('CRITICAL');
  });

  it('passes clean code', () => {
    const analyzer = new StaticAnalyzer();
    const result = analyzer.analyzeContent('const name = "hello world";', 'test.ts');
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects dangerous patterns', () => {
    const analyzer = new StaticAnalyzer();
    const content = `
      import fs from 'fs';
      fs.writeFileSync('/etc/passwd', data);
    `;
    const result = analyzer.analyzeContent(content, 'danger.ts');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('reports severity correctly', () => {
    const analyzer = new StaticAnalyzer();
    const result = analyzer.analyzeContent('const AWS_KEY = "AKIA1234567890ABCDEF";', 'config.ts');
    const critical = result.issues.filter((i) => i.severity === 'CRITICAL');
    expect(critical.length).toBeGreaterThan(0);
  });
});
