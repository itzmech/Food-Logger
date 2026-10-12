import { readFileSync, writeFileSync } from 'fs';

const p = 'src/pages/MenuPage.tsx';
let str = readFileSync(p, 'utf-8');

const lines = str.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Detect lines with literal backslash-quote sequences in the message string
  if (line.includes('month\\') || line.includes('day\\') || line.includes("log.'")) {
    console.log(`Line ${i + 1} needs fixing`);
    // Replace literal backslash-quote with curly apostrophe (U+2019)
    // Note: the file contains a literal backslash followed by a quote
    lines[i] = line
      .replace(/month\\/g, 'month\u2019')
      .replace(/day\\/g, 'day\u2019')
      .replace(/log.'\n/g, 'log.\u2019\n');
    modified = true;
  }
}

if (modified) {
  writeFileSync(p, lines.join('\n'), 'utf-8');
  console.log('File modified.');
} else {
  console.log('No lines needed fixing.');
}

// Verify
const lines2 = readFileSync(p, 'utf-8').split('\n');
console.log('--- After ---');
for (let i = 145; i <= 148; i++) {
  console.log(`${i + 1}: ${lines2[i]}`);
}
