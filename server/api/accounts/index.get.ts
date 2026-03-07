import { getDb } from '../../db'
import { listAccountsWithBalances } from '../../utils/listAccountsBalances'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  return listAccountsWithBalances(db, userId)
})
