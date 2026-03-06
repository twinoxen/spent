import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()

    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
    vi.stubGlobal('getRequestURL', (event: any) => ({ pathname: event.path }))
    vi.stubGlobal('getCookie', () => undefined)
    vi.stubGlobal('getHeader', () => undefined)
    vi.stubGlobal('createError', ({ statusCode, message }: any) => ({ statusCode, message }))
    vi.stubGlobal('setResponseHeader', vi.fn())
  })

  it('rejects unauthenticated GET /api/health/db', async () => {
    const middleware = (await import('./auth')).default
    const event = { path: '/api/health/db', method: 'GET', context: {} }

    await expect(middleware(event as any)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    })
  })

  it('still rejects unauthenticated protected API routes', async () => {
    const middleware = (await import('./auth')).default
    const event = { path: '/api/accounts', method: 'GET', context: {} }

    await expect(middleware(event as any)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    })
  })
})
