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
      const files = (await filesIn(outDir)).filter((file) => !['sw.js', 'sw-template.js'].includes(path.basename(file)) && !/^offline-shell-.*\.html$/.test(path.basename(file)))
      const hash = createHash('sha256')
      for (const file of files.sort()) hash.update(await readFile(file))
      const template = await readFile(path.join(config.root, 'public/sw-template.js'), 'utf8')
      hash.update(template)
      const version = hash.digest('hex').slice(0, 16)
      const base = config.base
      // A unique HTML URL prevents an older HTTP-cached index from being paired
      // with this release's hashed JavaScript and CSS during installation.
      const shellName = `offline-shell-${version}.html`
      await copyFile(path.join(outDir, 'index.html'), path.join(outDir, shellName))
      const shellUrl = base + shellName
      const urls = files.filter((file) => path.relative(outDir, file) !== 'index.html')
        .map((file) => base + path.relative(outDir, file).split(path.sep).join('/'))
      urls.push(shellUrl)
      await writeFile(path.join(outDir, 'sw.js'),
        `const CACHE_NAME = 'flight-briefing-${version}';\nconst APP_SHELL_URL = ${JSON.stringify(shellUrl)};\nconst PRECACHE_URLS = ${JSON.stringify(urls)};\n${template}`)
    },
  }
}
