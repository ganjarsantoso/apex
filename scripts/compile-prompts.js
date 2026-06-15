import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAGMENTS_DIR = path.resolve(__dirname, '../prompts/fragments');
const OUTPUT_PATH = path.resolve(__dirname, '../prompts/fusion-system-prompt.md');

const fragmentOrder = [
  '01-identity.md',
  '02-planning-rules.md',
  '03-execution-rules.md',
  '04-security-rules.md',
  '05-context-rules.md',
  '06-tool-rules.md',
  '07-review-rules.md',
];

function compilePrompt() {
  if (!fs.existsSync(FRAGMENTS_DIR)) {
    console.error(`Fragments directory not found: ${FRAGMENTS_DIR}`);
    process.exit(1);
  }

  const parts = [
    '# OpenCode Fusion Framework — System Prompt\n',
    '> Compiled from fragments. Edit fragments in prompts/fragments/, not this file.\n',
    '---\n',
  ];

  for (const fragment of fragmentOrder) {
    const fragmentPath = path.join(FRAGMENTS_DIR, fragment);
    if (!fs.existsSync(fragmentPath)) {
      console.warn(`Warning: Fragment not found: ${fragment}`);
      continue;
    }
    const content = fs.readFileSync(fragmentPath, 'utf8');
    parts.push(content);
    parts.push('\n---\n');
  }

  fs.writeFileSync(OUTPUT_PATH, parts.join('\n'), 'utf8');
  console.log(`Compiled prompt written to ${OUTPUT_PATH}`);
}

compilePrompt();
