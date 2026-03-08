import { spawn, type ChildProcess } from 'child_process'

const PORT = process.env.TEST_API_PORT ?? '4173'
const BASE_URL = `http://127.0.0.1:${PORT}`
const PROBE_URL = `${BASE_URL}/api/auth/login`

let server: ChildProcess | null = null
let serverOwned = false // true if WE started it (vs. reusing an existing one)

export async function setup() {
  // If a server is already accepting connections, reuse it (convenient for local dev).
  if (await probe(PROBE_URL, 1500)) {
    console.log(`[api-tests] Reusing running server at ${BASE_URL}`)
    return
  }

  console.log(`[api-tests] Starting Nuxt dev server on port ${PORT}...`)

  server = spawn('npm', ['run', 'dev', '--', '--port', PORT, '--host', '127.0.0.1'], {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  server.stderr?.on('data', (chunk) => process.stderr.write(chunk))
  server.on('error', (err) => console.error('[api-tests] Server error:', err))

  await waitForReady(PROBE_URL, 90_000)
  serverOwned = true
  console.log(`[api-tests] Server ready at ${BASE_URL}`)
}

export async function teardown() {
  if (server && serverOwned) {
    console.log('[api-tests] Stopping Nuxt dev server...')
    server.kill('SIGTERM')
    server = null
  }
}

/** Attempt a single probe request; returns true if the server responded. */
async function probe(url: string, timeoutMs: number): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    return true
  } catch {
    return false
  }
}

/** Poll until the server responds or the timeout is exceeded. */
async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probe(url, 2000)) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`[api-tests] Server at ${url} did not become ready within ${timeoutMs}ms`)
}
