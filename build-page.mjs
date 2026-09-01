// build-page.mjs — inline BOTH gated kernels into index.html VERBATIM, dependency order:
// fallbot.mjs (the reply law) then appetite.mjs (the LIFE law, which imports compose from it —
// the import line is stripped because both live in one script scope on the page).
// CI diffs the rebuild so the live page cannot drift from the proven laws. Fixpoint by construction.
import { readFileSync, writeFileSync } from 'node:fs';

// ⚑ EACH KERNEL GETS ITS OWN SCOPE — both declare `const str`/`tokens`, and concatenating
// them flat is a redeclaration error that takes the whole page down at parse time. Each is
// wrapped in an IIFE; only its exports reach window. appetite's import of compose is stripped
// and resolved from window.FALLBOT, which is why dependency order matters.
const KERNELS = [['fallbot.mjs', 'FALLBOT'], ['appetite.mjs', 'APPETITE']];
const blocks = [];
for (const [file, NS] of KERNELS) {
  const src = readFileSync(file, 'utf8');
  const exports = [...src.matchAll(/^export (?:function|const) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  if (exports.length === 0) { console.error('REFUSED: ' + file + ' exports nothing'); process.exit(1); }
  const body = src
    .replace(/^import\s*\{([^}]*)\}\s*from[^\n]*\n/gm, (_, names) => 'const {' + names + '} = window.FALLBOT;\n')
    .replace(/^export /gm, '').replace(/<\/script/g, '<\\/script');
  blocks.push('// ── ' + file + ' ──\nwindow.' + NS + ' = (() => {\n' + body + '\nreturn { ' + exports.join(', ') + ' };\n})();');
}
const shell = readFileSync('page.template.html', 'utf8');
const START = '/*__KERNEL_START__*/', END = '/*__KERNEL_END__*/';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(esc(START) + '[\\s\\S]*?' + esc(END));
const block = START + '\n' + blocks.join('\n') + '\n' + END;
if (!shell.includes(START)) { console.error('REFUSED: kernel markers not found in template'); process.exit(1); }
writeFileSync('index.html', shell.replace(re, () => block));
console.log('inlined ' + KERNELS.map(([f]) => f).join(' + ') + ' → index.html');
