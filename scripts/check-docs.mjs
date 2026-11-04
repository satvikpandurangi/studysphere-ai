import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const excluded = new Set(['docs/history/2026-10-22-project-review.md'])
const files = ['README.md', 'AGENTS.md', 'scripts/README.md', 'archive/README.md']

async function collect(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`
    if (relative === 'docs/archive/2026-09') continue
    if (entry.isDirectory()) await collect(relative)
    else if (entry.name.endsWith('.md') && !excluded.has(relative)) files.push(relative)
  }
}

await collect('docs')
const failures = []
let checked = 0
for (const file of files) {
  const content = (await readFile(path.join(root, file), 'utf8')).replace(/```[\s\S]*?```/g, '')
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '')
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue
    const local = decodeURIComponent(target.split(/[?#]/, 1)[0])
    if (!local) continue
    const resolved = path.resolve(root, path.dirname(file), local)
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      failures.push(`${file}: link escapes repository: ${target}`)
      continue
    }
    checked++
    try { await stat(resolved) } catch { failures.push(`${file}: missing ${target}`) }
  }
}
if (failures.length) {
  process.stderr.write(failures.join('\n') + '\n')
  process.exitCode = 1
} else {
  process.stdout.write(`Documentation links passed: ${files.length} maintained files, ${checked} local targets. Historical snapshots excluded.\n`)
}
