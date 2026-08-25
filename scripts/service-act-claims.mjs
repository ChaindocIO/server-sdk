#!/usr/bin/env node
/**
 * AC-27.9 — every place in this package that claims a key's signature is a person's own act.
 *
 * The criterion: «предъявлен поимённый перечень всех мест пакета … которые утверждают, что
 * подписание по ключу совершается от имени владельца бизнеса или его собственноручным актом;
 * перечень получен поиском по дереву пакета, а не сверкой с одним известным адресом», and its
 * failure clause names both halves — a claim left in the package, AND a known address corrected
 * while the list is not presented.
 *
 * So this is a search over every tracked file (dist/ excluded, being generated), with the
 * vocabulary written down rather than implied, and every hit carried in
 * scripts/service-act-claims.dispositions.json under a digest of its own line. A hit whose text
 * changes loses its disposition and comes back — which is the difference between this and checking
 * four exact phrases, where a paraphrase walks straight past.
 *
 * ⚠️ The id is a digest of (file, LINE TEXT), so two identical lines in one file share a
 * disposition — 36 matched lines carry 33 dispositions here, and moving a line inside its file
 * keeps its verdict. What must not survive is a CHANGE of text, and that does not.
 *
 *   node scripts/service-act-claims.mjs           # print the list
 *   node scripts/service-act-claims.mjs --check   # exit 1 if any hit is undispositioned
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The vocabulary, stated. Every way this package could say that an act performed with an
 * integration key is the key OWNER's own — by name, by hand, or by sole control.
 */
const VOCABULARY = [
  /\bon behalf of\b/i,
  /\bbehalf\b/i,
  /\bowner\b/i,
  /\bhandwritten\b/i,
  /\bwet[- ]signature\b/i,
  /\bpersonally\b/i,
  /\bin person\b/i,
  /\byour signature\b/i,
  /\byour own\b/i,
  /\bsigns? as\b/i,
  /\bsigned by (the )?(user|owner|account|business)\b/i,
  /\bacts? as\b/i,
  /\bimpersonat/i,
  /\baccount holder\b/i,
  /\bbusiness owner\b/i,
  /\bthe user who\b/i,
  /\bsole control\b/i,
  /\bself[- ]signed\b/i,
];

const DISPOSITIONS = path.join(ROOT, 'scripts', 'service-act-claims.dispositions.json');

/**
 * The instrument, its bookkeeping and its own printed output — excluded, and the reason is a defect
 * this guard had twice in a row.
 *
 * All three QUOTE the vocabulary they search for: the regexes, every dispositioned line's text, and
 * the presented list which reproduces each hit verbatim. So the moment they were TRACKED the search
 * found itself and --check went red on its own bookkeeping — green before the commit, red after,
 * because git ls-files had not listed them yet; and excluding the first two then left the search
 * finding its own output document. Third time in this run a guard has written its fixture into the
 * tree it scans.
 *
 * Exact paths, and nothing that is documentation OF the package is among them. The floor below is
 * what keeps this from growing into a way to make the guard quiet.
 */
const ITS_OWN = new Set([
  'scripts/service-act-claims.mjs',
  'scripts/service-act-claims.dispositions.json',
  'docs/SERVICE_ACT_CLAIMS.md',
]);
const TAB = String.fromCharCode(9);

const digest = (file, text) =>
  createHash('sha256').update(file + ' ' + text.trim()).digest('hex').slice(0, 16);

const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => !f.startsWith('dist/'))
  .filter((f) => !ITS_OWN.has(f));

const hits = [];
for (const file of files) {
  const abs = path.join(ROOT, file);
  if (!existsSync(abs)) continue;
  let bodyText;
  try {
    bodyText = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  bodyText.split('\n').forEach((line, i) => {
    const matched = VOCABULARY.find((v) => v.test(line));
    if (!matched) return;
    hits.push({
      file,
      line: i + 1,
      id: digest(file, line),
      vocabulary: String(matched),
      text: line.trim().slice(0, 200),
    });
  });
}

const dispositions = existsSync(DISPOSITIONS) ? JSON.parse(readFileSync(DISPOSITIONS, 'utf8')) : {};
const undispositioned = hits.filter((h) => !dispositions[h.id]);

if (process.argv.includes('--check')) {
  console.log('[service-act-claims] ' + files.length + ' tracked files searched, ' + hits.length + ' lines matched');
  if (undispositioned.length) {
    console.error('[service-act-claims] ' + undispositioned.length + ' line(s) have no disposition:');
    for (const h of undispositioned) console.error('  ' + h.file + ':' + h.line + '  ' + h.id + '  ' + h.text);
    process.exit(1);
  }
  // Floors, so neither an empty search nor a growing exclusion list can pass as a clean package.
  // The second is the guard on ITS_OWN: the package's own documentation, types and published
  // snapshot must still be REACHED, named by area rather than by file.
  if (hits.length === 0) {
    console.error('[service-act-claims] the search matched NOTHING — that is a broken search, not a clean package');
    process.exit(1);
  }
  const areas = ['docs/', 'src/', 'references/'];
  const missed = areas.filter((a) => !hits.some((h) => h.file.startsWith(a)));
  if (missed.length) {
    console.error('[service-act-claims] the search reached NO line in: ' + missed.join(', ') +
      ' — an exclusion has grown until the guard stopped looking at the package');
    process.exit(1);
  }
  console.log('[service-act-claims] every matched line is dispositioned');
  process.exit(0);
}

console.log('# AC-27.9 — every line of chaindoc-websdk-server-sdk matching the service-act vocabulary');
console.log('# ' + files.length + ' tracked files (dist/ excluded), ' + hits.length + ' lines matched, ' +
  new Set(hits.map((h) => h.file)).size + ' files');
console.log('');
for (const h of hits) {
  const d = dispositions[h.id];
  console.log(h.file + ':' + h.line + TAB + (d ? d.verdict : 'UNDISPOSITIONED') + TAB + h.text);
}
