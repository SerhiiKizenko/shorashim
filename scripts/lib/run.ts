import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

export async function run(
  cmd: string,
  args: string[],
  opts: { maxBuffer?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  const { stdout } = await execFileP(cmd, args, {
    maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
    env: opts.env ?? process.env,
    encoding: 'utf8',
  })
  return stdout
}

/** Run `fn` over `items` with at most `concurrency` in flight; results keep input order. */
export async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!, i)
    }
  })
  await Promise.all(workers)
  return results
}

export async function pdfPages(file: string): Promise<number> {
  const out = await run('pdfinfo', [file])
  const m = /^Pages:\s+(\d+)/m.exec(out)
  return m ? Number(m[1]) : 0
}

export function md5File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('md5')
    createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject)
  })
}

export const fmtBytes = (n: number): string => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`)
