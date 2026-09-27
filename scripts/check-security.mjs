import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const path of new Set(paths)) {
  if (!existsSync(path)) continue;
  if (/(^|\/)\.env($|\.)/.test(path) && !path.endsWith('.env.example')) findings.push(`${path}: archivo de entorno versionable`);
  const content = readFileSync(path, 'utf8');
  if (/sb_secret_[a-zA-Z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/.test(content)) findings.push(`${path}: posible secreto (valor omitido)`);
  for (const token of content.match(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g) || []) {
    try { if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') findings.push(`${path}: token administrativo (valor omitido)`); } catch { /* No es un JWT reconocible. */ }
  }
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.dependencies?.firebase || pkg.devDependencies?.firebase) findings.push('package.json: dependencia Firebase');
try { execFileSync('git', ['check-ignore', '-q', '.env']); } catch { findings.push('.env no está ignorado'); }
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log('Sin patrones de claves secretas en archivos rastreados o nuevos no ignorados; .env ignorado; sin dependencia Firebase.');
