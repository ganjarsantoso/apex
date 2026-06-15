export interface AnalysisResult {
  issues: SecurityIssue[];
  passed: boolean;
  summary: string;
}

export interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'secret' | 'credential' | 'dangerous_pattern' | 'misconfiguration';
  file?: string;
  line?: number;
  description: string;
  recommendation: string;
}

const SECRET_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|secret[_-]?key|secretkey)\s*[=:]\s*['"][^'"]+['"]/i,
  /(?:sk-[a-zA-Z0-9]{20,})/,
  /(?:AKIA[0-9A-Z]{16})/,
  /(?:ghp_[a-zA-Z0-9]{36})/,
  /(?:gho_[a-zA-Z0-9]{36})/,
  /(?:ghu_[a-zA-Z0-9]{36})/,
];

const DANGEROUS_PATTERNS: RegExp[] = [
  /process\.env\./,
  /require\(['"]dotenv['"]\)/,
  /fs\.(read|write)FileSync/,
  /exec\(/,
  /spawn\(/,
  /child_process/,
];

export class StaticAnalyzer {
  analyzeContent(content: string, fileName?: string): AnalysisResult {
    const issues: SecurityIssue[] = [];

    for (const pattern of SECRET_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        issues.push({
          severity: 'CRITICAL',
          type: 'secret',
          file: fileName,
          description: `Potential secret/key detected: ${match[0].substring(0, 40)}...`,
          recommendation: 'Remove hardcoded secrets. Use environment variables or a secret manager.',
        });
      }
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        issues.push({
          severity: 'HIGH',
          type: 'dangerous_pattern',
          file: fileName,
          description: `Dangerous pattern detected: ${match[0]}`,
          recommendation: 'Sanitize inputs and validate before using dangerous operations.',
        });
      }
    }

    return {
      issues,
      passed: issues.filter((i) => i.severity === 'CRITICAL').length === 0,
      summary: `Found ${issues.length} issue(s): ${issues.filter((i) => i.severity === 'CRITICAL').length} critical, ${issues.filter((i) => i.severity === 'HIGH').length} high`,
    };
  }
}
