<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Bills</h1>
      <UButton label="Add Bill" color="primary" icon="i-heroicons-plus" @click="openAddModal" />
    </div>

    <p v-if="loadError" class="text-red-500 text-sm mb-4">{{ loadError }}</p>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>

    <UCard v-else>
      <div v-if="bills.length === 0" class="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
        No bills yet. Click "Add Bill" to get started.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th class="py-3 pr-4">Name</th>
              <th class="py-3 pr-4">Amount</th>
              <th class="py-3 pr-4">Occurrence</th>
              <th class="py-3 pr-4">Due</th>
              <th v-if="hasSpreadMonthly" class="py-3 pr-4">Monthly equiv</th>
              <th class="py-3 pr-4">Active</th>
              <th class="py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="bill in bills"
              :key="bill.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 pr-4 font-medium text-gray-900 dark:text-white">{{ bill.name }}</td>
              <td class="py-3 pr-4 text-gray-700 dark:text-gray-300 font-mono">{{ formatMoney(bill.amount) }}</td>
              <td class="py-3 pr-4">
                <UBadge :label="occurrenceLabel(bill.occurrence)" :color="occurrenceColor(bill.occurrence)" variant="soft" size="sm" />
              </td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ formatDue(bill) }}</td>
              <td v-if="hasSpreadMonthly" class="py-3 pr-4 text-gray-600 dark:text-gray-400 font-mono">
                <span v-if="bill.spreadMonthly && (bill.occurrence === 'quarterly' || bill.occurrence === 'annual')">
                  {{ formatMoney(monthlyEquiv(bill)) }}
                </span>
              </td>
              <td class="py-3 pr-4">
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full"
                  :class="bill.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
                />
              </td>
              <td class="py-3">
                <div class="flex items-center gap-1">
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-pencil" @click="openEditModal(bill)" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" @click="confirmDelete(bill)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Add/Edit Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">
              {{ editingBill ? 'Edit Bill' : 'Add Bill' }}
            </p>
          </template>

          <div class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <UInput v-model="form.name" placeholder="e.g. Netflix, Rent, Internet" />
            </div>

            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount</label>
              <UInput v-model.number="form.amount" type="number" placeholder="0.00" :ui="{ base: 'pl-7' }">
                <template #leading>
                  <span class="text-gray-400 text-sm">$</span>
                </template>
              </UInput>
            </div>

            <!-- Occurrence -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Occurrence</label>
              <USelect
                v-model="form.occurrence"
                :items="occurrenceOptions"
                value-key="value"
                label-key="label"
                @update:model-value="onOccurrenceChange"
              />
            </div>

            <!-- Due date / day (one_time) -->
            <div v-if="form.occurrence === 'one_time'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
              <input
                v-model="form.dueDate"
                type="date"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <!-- Due day (monthly) -->
            <div v-if="form.occurrence === 'monthly'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Day of Month</label>
              <USelect
                v-model="form.dueDayOfMonth"
                :items="dayOptions"
                value-key="value"
                label-key="label"
              />
            </div>

            <!-- Due day + anchor month (quarterly) -->
            <div v-if="form.occurrence === 'quarterly'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Anchor Month</label>
                <USelect
                  v-model="form.dueMonth"
                  :items="monthOptions"
                  value-key="value"
                  label-key="label"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Day of Month</label>
                <USelect
                  v-model="form.dueDayOfMonth"
                  :items="dayOptions"
                  value-key="value"
                  label-key="label"
                />
              </div>
            </div>

            <!-- Due month + day (annual) -->
            <div v-if="form.occurrence === 'annual'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Month</label>
                <USelect
                  v-model="form.dueMonth"
                  :items="monthOptions"
                  value-key="value"
                  label-key="label"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Day of Month</label>
                <USelect
                  v-model="form.dueDayOfMonth"
                  :items="dayOptions"
                  value-key="value"
                  label-key="label"
                />
              </div>
            </div>

            <!-- Spread monthly (quarterly + annual only) -->
            <div v-if="form.occurrence === 'quarterly' || form.occurrence === 'annual'" class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show as monthly equivalent</span>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ form.occurrence === 'quarterly' ? 'Shows amount ÷ 3 per month' : 'Shows amount ÷ 12 per month' }}
                </p>
              </div>
              <USwitch v-model="form.spreadMonthly" />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes <span class="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Any additional notes..."
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <!-- Active -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              <USwitch v-model="form.isActive" />
            </div>
          </div>

          <template #footer>
            <p v-if="saveError" class="text-red-500 text-sm mb-3">{{ saveError }}</p>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showModal = false" />
              <UButton :label="editingBill ? 'Update' : 'Create'" color="primary" :loading="saving" @click="saveBill" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Delete bill?</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete <strong class="text-gray-700 dark:text-gray-300">{{ deletingBill?.name }}</strong>? This cannot be undone.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteModal = false" />
            <UButton label="Delete" icon="i-heroicons-trash" color="error" :loading="deleting" @click="deleteBill" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/formatMoney'

interface Bill {
  id: number
  name: string
  amount: number
  occurrence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  dueDate: string
  isEndOfMonth: boolean
  spreadMonthly: boolean
  isActive: boolean
  notes: string | null
  createdAt: string
}

// ── State ──────────────────────────────────────────────────────────────────

const bills = ref<Bill[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const saveError = ref<string | null>(null)
const loadError = ref<string | null>(null)

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingBill = ref<Bill | null>(null)
const deletingBill = ref<Bill | null>(null)

// ── Form ───────────────────────────────────────────────────────────────────

const todayISO = new Date().toISOString().slice(0, 10)

function defaultForm() {
  return {
    name: '',
    amount: 0,
    occurrence: 'monthly' as Bill['occurrence'],
    dueDate: todayISO,      // used for one_time
    dueMonth: 0,            // 0–11, used for quarterly/annual anchor
    dueDayOfMonth: 1,       // 1–31, capped to month length for quarterly/annual
    spreadMonthly: false,
    isActive: true,
    notes: '',
  }
}

const form = ref(defaultForm())

// ── Options ────────────────────────────────────────────────────────────────

const occurrenceOptions = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
]

const monthOptions = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function daysInMonth(month: number): number {
  // month: 0-11. Use a non-leap year so Feb=28 (matches the common case).
  return new Date(2001, month + 1, 0).getDate()
}

// Always offer 1–31. Runtime clamps to the month's actual last day when the
// bill is evaluated, so "31" means "end of the month" for short months.
const dayOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: ordinal(i + 1) }))

// ── Occurrence change handler ──────────────────────────────────────────────

function onOccurrenceChange(val: Bill['occurrence']) {
  if (val === 'one_time' || val === 'monthly') {
    form.value.spreadMonthly = false
  }
  if (val === 'one_time') {
    form.value.dueDate = todayISO
  }
}

// ── Display helpers ────────────────────────────────────────────────────────

function occurrenceLabel(occurrence: Bill['occurrence']): string {
  return { one_time: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' }[occurrence]
}

function occurrenceColor(occurrence: Bill['occurrence']): 'neutral' | 'primary' | 'info' | 'success' {
  return { one_time: 'neutral', monthly: 'primary', quarterly: 'info', annual: 'success' }[occurrence] as any
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function quarterlyMonths(anchorMonth: number): number[] {
  // derive the 4 months in the quarterly cycle from anchor
  const offset = anchorMonth % 3
  return [offset, offset + 3, offset + 6, offset + 9].map(m => m % 12)
}

function effectiveDay(bill: Bill): number {
  // Legacy records with isEndOfMonth=true stored day capped at 28.
  // Translate to the real last day of the month for display.
  const d = new Date(bill.dueDate + 'T12:00:00')
  if (bill.isEndOfMonth) {
    if (bill.occurrence === 'monthly') return 31
    return daysInMonth(d.getMonth())
  }
  return d.getDate()
}

function formatDue(bill: Bill): string {
  const d = new Date(bill.dueDate + 'T12:00:00')
  const month = d.getMonth()
  const day = effectiveDay(bill)

  switch (bill.occurrence) {
    case 'one_time': {
      const year = d.getFullYear()
      return `${MONTH_SHORT[month]} ${d.getDate()}, ${year}`
    }
    case 'monthly':
      return `${ordinal(day)} of month`
    case 'quarterly': {
      const months = quarterlyMonths(month)
      return `${months.map(m => MONTH_SHORT[m]).join('/')} ${day}`
    }
    case 'annual':
      return `${MONTH_SHORT[month]} ${day} (annual)`
  }
}

function monthlyEquiv(bill: Bill): number {
  if (bill.occurrence === 'quarterly') return bill.amount / 3
  if (bill.occurrence === 'annual') return bill.amount / 12
  return bill.amount
}

const hasSpreadMonthly = computed(() =>
  bills.value.some(b => b.spreadMonthly && (b.occurrence === 'quarterly' || b.occurrence === 'annual'))
)

// ── dueDate serialisation ──────────────────────────────────────────────────
// We store a YYYY-MM-DD anchor date. For monthly, we just encode as
// 2001-MM-DD where MM=01 for monthly (the day is what matters).
// For quarterly/annual we encode month + day from the form selects.

// Returns { dueDate, isEndOfMonth }. For quarterly/annual bills, if the user
// picked a day beyond the selected month's length, we clamp to the month end
// and flag isEndOfMonth so reload shows "31" again (user intent preserved).
function buildDuePayload(): { dueDate: string; isEndOfMonth: boolean } {
  const { occurrence, dueDate, dueMonth, dueDayOfMonth } = form.value
  if (occurrence === 'one_time') return { dueDate, isEndOfMonth: false }
  if (occurrence === 'monthly') {
    // Monthly stores in Jan (31 days) so 1–31 is always valid.
    const day = Math.min(Math.max(dueDayOfMonth, 1), 31)
    return { dueDate: `2001-01-${String(day).padStart(2, '0')}`, isEndOfMonth: false }
  }
  const maxDay = daysInMonth(dueMonth)
  const picked = Math.min(Math.max(dueDayOfMonth, 1), 31)
  const day = Math.min(picked, maxDay)
  const month = String(dueMonth + 1).padStart(2, '0')
  return {
    dueDate: `2001-${month}-${String(day).padStart(2, '0')}`,
    isEndOfMonth: picked > maxDay,
  }
}

function parseDueDateIntoForm(bill: Bill) {
  const d = new Date(bill.dueDate + 'T12:00:00')
  form.value.dueDate = bill.dueDate
  form.value.dueMonth = d.getMonth()
  // If the record was saved with end-of-month intent (legacy toggle OR user
  // picked a day beyond the month length), show 31 in the picker.
  if (bill.isEndOfMonth) {
    form.value.dueDayOfMonth = 31
  } else {
    form.value.dueDayOfMonth = d.getDate()
  }
}

// ── Modal open/close ───────────────────────────────────────────────────────

function openAddModal() {
  editingBill.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEditModal(bill: Bill) {
  editingBill.value = bill
  form.value = {
    name: bill.name,
    amount: bill.amount,
    occurrence: bill.occurrence,
    dueDate: bill.dueDate,
    dueMonth: 0,
    dueDayOfMonth: 1,
    spreadMonthly: bill.spreadMonthly,
    isActive: bill.isActive,
    notes: bill.notes ?? '',
  }
  parseDueDateIntoForm(bill)
  showModal.value = true
}

function confirmDelete(bill: Bill) {
  deletingBill.value = bill
  showDeleteModal.value = true
}

// ── API calls ──────────────────────────────────────────────────────────────

async function loadBills() {
  loading.value = true
  try {
    bills.value = await $fetch<Bill[]>('/api/bills')
  } catch (error) {
    console.error('Failed to load bills:', error)
    loadError.value = 'Failed to load bills.'
  } finally {
    loading.value = false
  }
}

async function saveBill() {
  saveError.value = null
  if (!form.value.name.trim()) {
    saveError.value = 'Name is required.'
    return
  }
  if (!form.value.amount || form.value.amount <= 0) {
    saveError.value = 'Amount must be greater than 0.'
    return
  }
  if (!form.value.dueDate && form.value.occurrence === 'one_time') {
    saveError.value = 'Due date is required.'
    return
  }
  saving.value = true
  try {
    const due = buildDuePayload()
    const payload = {
      name: form.value.name,
      amount: form.value.amount,
      occurrence: form.value.occurrence,
      dueDate: due.dueDate,
      isEndOfMonth: due.isEndOfMonth,
      spreadMonthly: form.value.spreadMonthly,
      isActive: form.value.isActive,
      notes: form.value.notes || null,
    }
    if (editingBill.value) {
      await $fetch(`/api/bills/${editingBill.value.id}`, { method: 'PATCH', body: payload })
    } else {
      await $fetch('/api/bills', { method: 'POST', body: payload })
    }
    showModal.value = false
    await loadBills()
  } catch (e: any) {
    console.error('Failed to save bill:', e)
    saveError.value = e?.data?.message || 'Failed to save bill.'
  } finally {
    saving.value = false
  }
}

async function deleteBill() {
  if (!deletingBill.value) return
  deleting.value = true
  try {
    await $fetch(`/api/bills/${deletingBill.value.id}`, { method: 'DELETE' })
    showDeleteModal.value = false
    deletingBill.value = null
    await loadBills()
  } catch (e: any) {
    console.error('Failed to delete bill:', e)
    loadError.value = e?.data?.message || 'Failed to delete bill.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadBills)
</script>
