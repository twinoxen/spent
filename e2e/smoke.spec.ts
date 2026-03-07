import { expect, test, type APIResponse, type Page } from '@playwright/test'

function uniqueEmail() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `e2e-${suffix}@example.com`
}

async function mcpCallListAccounts(page: Page) {
  const request = page.context().request

  const initResponse = await request.post('/api/mcp', {
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    data: {
      jsonrpc: '2.0',
      id: 'init-1',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'playwright-e2e', version: '1.0.0' },
      },
    },
  })

  expect(initResponse.ok()).toBeTruthy()
  const sessionId = initResponse.headers()['mcp-session-id']

  const maybeNotify = async () => {
    if (!sessionId) return
    await request.post('/api/mcp', {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
      },
      data: {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      },
    })
  }

  await maybeNotify()

  const callHeaders: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  }
  if (sessionId) callHeaders['mcp-session-id'] = sessionId

  const callResponse: APIResponse = await request.post('/api/mcp', {
    headers: callHeaders,
    data: {
      jsonrpc: '2.0',
      id: 'tools-call-1',
      method: 'tools/call',
      params: {
        name: 'list_accounts',
        arguments: {},
      },
    },
  })

  expect(callResponse.ok()).toBeTruthy()
  const payload = await callResponse.json()

  // JSON-RPC errors fail the request
  expect(payload.error).toBeFalsy()
  expect(payload.result?.isError).not.toBe(true)
}

test('register/login, create account + transaction, and MCP list_accounts works', async ({ page }) => {
  const email = uniqueEmail()
  const password = 'StrongPass123!'
  const accountName = `E2E Account ${Date.now()}`
  const txDescription = `E2E Grocery ${Date.now()}`

  await page.goto('/login')
  // Wait for all JS modules to finish loading so Vue has hydrated before we
  // interact with reactive elements. In dev mode Vite compiles modules on
  // demand; without this wait the "Sign up" click can land on the
  // SSR-rendered button before Vue attaches its event handler.
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  // sanity check login flow with same credentials
  await page.goto('/login')
  await expect(page).toHaveURL('/')

  await page.goto('/accounts')
  await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Add Account' }).first().click()

  const addAccountDialog = page.getByRole('dialog')
  await expect(addAccountDialog).toBeVisible()
  await addAccountDialog.getByPlaceholder('e.g. Apple Card, Chase Checking').fill(accountName)
  await addAccountDialog.locator('select').selectOption('checking')
  await addAccountDialog.getByPlaceholder('e.g. Apple, Chase, Wells Fargo').fill('E2E Bank')
  await addAccountDialog.getByRole('button', { name: 'Add Account' }).click()

  // Account name appears in multiple places (card + modal preview). Assert the card title.
  await expect(page.getByRole('heading', { name: accountName })).toBeVisible()

  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await page.getByRole('button', { name: 'Add Transaction' }).click()

  const addTransactionDialog = page.getByRole('dialog')
  await expect(addTransactionDialog).toBeVisible()
  await addTransactionDialog.getByPlaceholder('e.g. Coffee at Blue Bottle').fill(txDescription)
  await addTransactionDialog.getByPlaceholder('0.00').fill('12.34')
  await addTransactionDialog.locator('select').selectOption({ label: accountName })
  await addTransactionDialog.getByPlaceholder('e.g. Blue Bottle Coffee').fill('E2E Store')
  await addTransactionDialog.getByRole('button', { name: 'Add Transaction' }).click()

  await expect(page.getByRole('cell', { name: txDescription })).toBeVisible()
  await expect(page.getByText(accountName).first()).toBeVisible()

  await page.goto('/accounts')
  await expect(page.getByRole('heading', { name: accountName })).toBeVisible()

  await page.goto('/transactions')
  await expect(page.getByRole('cell', { name: txDescription })).toBeVisible()

  await mcpCallListAccounts(page)
})
