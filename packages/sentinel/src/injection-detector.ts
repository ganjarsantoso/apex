export interface InjectionResult {
  detected: boolean;
  confidence: number;
  type?: 'hidden_instruction' | 'tool_hijack' | 'context_poisoning';
  evidence?: string;
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+(instructions|commands)/i,
  /disregard\s+(all\s+)?(prior|previous)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+/i,
  /forget\s+(everything|all)/i,
  /system\s+(prompt|message|instruction)/i,
  /(\u200B|\u200C|\u200D|\uFEFF)/,
  /\\x[0-9a-f]{2,}/i,
];

const TOOL_HIJACK_PATTERNS: RegExp[] = [
  /run\s+the\s+following\s+command/i,
  /execute\s+this\s+code/i,
  /you\s+must\s+use\s+the\s+(write|edit|bash)/i,
];

export class InjectionDetector {
  detect(input: string): InjectionResult {
    const zeroWidthChars = input.match(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g);
    if (zeroWidthChars && zeroWidthChars.length > 5) {
      return {
        detected: true,
        confidence: 0.9,
        type: 'context_poisoning',
        evidence: `Found ${zeroWidthChars.length} zero-width characters`,
      };
    }

    for (const pattern of INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 0.85,
          type: 'hidden_instruction',
          evidence: match[0],
        };
      }
    }

    for (const pattern of TOOL_HIJACK_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 0.7,
          type: 'tool_hijack',
          evidence: match[0],
        };
      }
    }

    return { detected: false, confidence: 0 };
  }
}
