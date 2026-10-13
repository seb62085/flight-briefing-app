import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export function offlineBuild() {
  let config
  return {
    name: 'flight-briefing-offline',
    apply: 'build',
    configResolved(resolved) { config = resolved },
    async closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir)
      const fonts = path.resolve(config.root, 'node_modules/pdfjs-dist/standard_fonts')
      await mkdir(path.join(outDir, 'standard_fonts'), { recursive: true })
      for (const font of await readdir(fonts)) {
        await copyFile(path.join(fonts, font), path.join(outDir, 'standard_fonts', font))
      }
      async function filesIn(dir) {
        const entries = await readdir(dir, { withFileTypes: true })
        const files = await Promise.all(entries.map((entry) => entry.isDirectory()
          ? filesIn(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))
        return files.flat()
      }
      const files = (await filesIn(outDir)).filter((file) => !['sw.js', 'sw-template.js'].includes(path.basename(file)))
      const hash = createHash('sha256')
      for (const file of files.sort()) hash.update(await readFile(file))
      const base = config.base
      const urls = files.map((file) => base + path.relative(outDir, file).split(path.sep).join('/'))
      const template = await readFile(path.join(config.root, 'public/sw-template.js'), 'utf8')
      await writeFile(path.join(outDir, 'sw.js'),
        `const CACHE_NAME = 'flight-briefing-${hash.digest('hex').slice(0, 16)}';\nconst PRECACHE_URLS = ${JSON.stringify(urls)};\n${template}`)
    },
  }
}
