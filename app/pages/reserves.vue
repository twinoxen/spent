<template>
  <div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Reserves</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Earmark cash for future obligations without creating fake bank transactions.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton label="Auto-accrue" color="neutral" variant="outline" icon="i-heroicons-arrow-path" :loading="accruing" @click="autoAccrue" />
        <UButton label="Add Reserve" color="primary" icon="i-heroicons-plus" @click="openAddModal" />
      </div>
    </div>

    <p v-if="loadError" class="text-red-500 text-sm mb-4">{{ loadError }}</p>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>

    <template v-else>
      <div v-if="summary" class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Calculated Cash</p>
          <p class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(summary.calculatedBalance) }}</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Scheduled Bills</p>
          <p class="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{{ formatMoney(summary.scheduledUpcomingBills) }}</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Active Reserves</p>
          <p class="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{{ formatMoney(summary.activeReserves) }}</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:col-span-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Available to Spend</p>
          <p
            class="text-2xl font-bold tabular-nums"
            :class="summary.availableToSpend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
          >
            {{ formatMoney(summary.availableToSpend) }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">calculated cash minus bills and reserves</p>
        </div>
      </div>

      <UCard>
        <div v-if="reserves.length === 0" class="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
          No reserves yet. Create one for HOA, taxes, annual insurance, or any future obligation.
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            v-for="reserve in reserves"
            :key="reserve.id"
            class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ reserve.name }}</h2>
                  <UBadge :label="statusLabel(reserve.status)" :color="statusColor(reserve.status)" variant="soft" size="sm" />
                </div>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {{ reserve.accountName || 'Account' }}<span v-if="reserve.category"> · {{ reserve.category }}</span>
                </p>
              </div>
              <div class="flex items-center gap-1">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-banknotes" title="Add contribution" @click="openMovementModal(reserve, 'contribution')" />
                <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-arrow-uturn-left" title="Release funds" @click="openMovementModal(reserve, 'release')" />
                <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-pencil" title="Edit reserve" @click="openEditModal(reserve)" />
                <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" title="Delete reserve" @click="confirmDelete(reserve)" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p class="text-xs text-gray-400 dark:text-gray-500">Reserved</p>
                <p class="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(reserve.currentReservedAmount) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 dark:text-gray-500">Target</p>
                <p class="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(reserve.targetAmount) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 dark:text-gray-500">Contribution</p>
                <p class="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                  {{ formatMoney(reserve.contributionAmount) }} / {{ cadenceLabel(reserve.contributionCadence) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400 dark:text-gray-500">Next due</p>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ formatDate(reserve.nextDueDate) }}</p>
              </div>
            </div>

            <div class="mb-3">
              <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-indigo-500 transition-all"
                  :style="{ width: `${Math.min((reserve.progress ?? 0) * 100, 100)}%` }"
                />
              </div>
              <div class="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>{{ Math.round((reserve.progress ?? 0) * 100) }}% funded</span>
                <span v-if="reserve.shortfall > 0">{{ formatMoney(reserve.shortfall) }} short</span>
                <span v-else-if="reserve.surplus > 0">{{ formatMoney(reserve.surplus) }} surplus</span>
                <span v-else>On target</span>
              </div>
            </div>

            <p v-if="reserve.notes" class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ reserve.notes }}</p>

            <div class="flex flex-wrap gap-2">
              <UButton size="xs" color="neutral" variant="outline" label="Movements" icon="i-heroicons-clock" @click="openHistoryModal(reserve)" />
              <UButton v-if="reserve.status !== 'active'" size="xs" color="success" variant="soft" label="Activate" @click="setStatus(reserve, 'active')" />
              <UButton v-if="reserve.status === 'active'" size="xs" color="warning" variant="soft" label="Pause" @click="setStatus(reserve, 'paused')" />
              <UButton v-if="reserve.status !== 'completed'" size="xs" color="neutral" variant="soft" label="Complete" @click="setStatus(reserve, 'completed')" />
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <UModal scrollable v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">
              {{ editingReserve ? 'Edit Reserve' : 'Add Reserve' }}
            </p>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <UInput v-model="form.name" placeholder="e.g. 116 HOA" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Account</label>
                <USelect v-model="form.accountId" :items="accountOptions" value-key="value" label-key="label" placeholder="Select account" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target amount</label>
                <UInput v-model.number="form.targetAmount" type="number" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currently reserved</label>
                <UInput v-model.number="form.currentReservedAmount" type="number" step="0.01" placeholder="0.00" :disabled="!!editingReserve" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contribution</label>
                <UInput v-model.number="form.contributionAmount" type="number" step="0.01" placeholder="0.00" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contribution cadence</label>
                <USelect v-model="form.contributionCadence" :items="contributionCadenceOptions" value-key="value" label-key="label" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment cadence</label>
                <USelect v-model="form.actualPaymentCadence" :items="paymentCadenceOptions" value-key="value" label-key="label" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <USelect v-model="form.status" :items="statusOptions" value-key="value" label-key="label" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Next due date</label>
                <input
                  v-model="form.nextDueDate"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <UInput v-model="form.category" placeholder="e.g. HOA, Insurance, Taxes" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <p v-if="saveError" class="text-sm text-red-500">{{ saveError }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showModal = false" />
              <UButton :label="editingReserve ? 'Update' : 'Create'" color="primary" :loading="saving" @click="saveReserve" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showMovementModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">
              {{ movementForm.type === 'contribution' ? 'Add Contribution' : movementForm.type === 'release' ? 'Release Reserve' : 'Adjust Reserve' }}
            </p>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ selectedReserve?.name }} currently has <strong>{{ formatMoney(selectedReserve?.currentReservedAmount ?? 0) }}</strong> reserved.
            </p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                <input
                  v-model="movementForm.date"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount</label>
                <UInput v-model.number="movementForm.amount" type="number" step="0.01" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                v-model="movementForm.notes"
                rows="2"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <p v-if="movementError" class="text-sm text-red-500">{{ movementError }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showMovementModal = false" />
              <UButton label="Save Movement" color="primary" :loading="savingMovement" @click="saveMovement" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal scrollable v-model:open="showHistoryModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ selectedReserve?.name }} movements</p>
          </template>

          <div v-if="loadingMovements" class="py-8 text-center text-sm text-gray-400">Loading movements...</div>
          <div v-else-if="movements.length === 0" class="py-8 text-center text-sm text-gray-400">No movements yet.</div>
          <div v-else class="space-y-3">
            <div
              v-for="movement in movements"
              :key="movement.id"
              class="rounded-lg border border-gray-100 dark:border-gray-800 p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <UBadge :label="movementTypeLabel(movement.type)" :color="movementTypeColor(movement.type)" variant="soft" size="sm" />
                    <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(movement.date) }}</span>
                  </div>
                  <p v-if="movement.notes" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ movement.notes }}</p>
                  <p v-if="movement.transaction?.id" class="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Linked to {{ movement.transaction.description }} ({{ formatMoney(movement.transaction.amount) }})
                  </p>
                </div>
                <p class="text-sm font-semibold tabular-nums" :class="movement.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'">
                  {{ movement.amount >= 0 ? '+' : '' }}{{ formatMoney(movement.amount) }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Delete reserve?</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            This will delete <strong>{{ deletingReserve?.name }}</strong> and its reserve movement history. It will not delete any bank transactions.
          </p>
          <div class="flex justify-end gap-3 pt-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteModal = false" />
            <UButton label="Delete" color="error" :loading="deleting" @click="deleteReserve" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/formatMoney'

type ReserveStatus = 'active' | 'paused' | 'completed'
type ContributionCadence = 'monthly' | 'biweekly' | 'weekly' | 'custom'
type PaymentCadence = 'monthly' | 'quarterly' | 'annual' | 'custom'
type MovementType = 'contribution' | 'release' | 'adjustment'

interface Reserve {
  id: number
  accountId: number
  accountName: string | null
  name: string
  targetAmount: number
  currentReservedAmount: number
  contributionAmount: number
  contributionCadence: ContributionCadence
  actualPaymentCadence: PaymentCadence
  nextDueDate: string
  category: string | null
  status: ReserveStatus
  notes: string | null
  progress: number | null
  shortfall: number
  surplus: number
}

const todayISO = new Date().toISOString().slice(0, 10)

const reserves = ref<Reserve[]>([])
const accounts = ref<any[]>([])
const summary = ref<any>(null)
const movements = ref<any[]>([])

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const accruing = ref(false)
const savingMovement = ref(false)
const loadingMovements = ref(false)

const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const movementError = ref<string | null>(null)

const showModal = ref(false)
const showDeleteModal = ref(false)
const showMovementModal = ref(false)
const showHistoryModal = ref(false)

const editingReserve = ref<Reserve | null>(null)
const deletingReserve = ref<Reserve | null>(null)
const selectedReserve = ref<Reserve | null>(null)

const contributionCadenceOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]

const paymentCadenceOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
]

const accountOptions = computed(() =>
  accounts.value
    .filter(account => ['checking', 'savings', 'debit'].includes(account.type))
    .map(account => ({
      value: account.id,
      label: `${account.name}${account.institution ? ` - ${account.institution}` : ''}`,
    }))
)

function defaultForm() {
  return {
    name: '',
    accountId: null as number | null,
    targetAmount: 0,
    currentReservedAmount: 0,
    contributionAmount: 0,
    contributionCadence: 'monthly' as ContributionCadence,
    actualPaymentCadence: 'quarterly' as PaymentCadence,
    nextDueDate: todayISO,
    category: '',
    status: 'active' as ReserveStatus,
    notes: '',
  }
}

const form = ref(defaultForm())

const movementForm = ref({
  date: todayISO,
  amount: 0,
  type: 'contribution' as MovementType,
  notes: '',
})

async function loadAll() {
  loading.value = true
  loadError.value = null
  try {
    const [reserveRows, accountRows, summaryRow] = await Promise.all([
      $fetch<Reserve[]>('/api/reserves'),
      $fetch<any[]>('/api/accounts'),
      $fetch('/api/reserves/summary'),
    ])
    reserves.value = reserveRows
    accounts.value = accountRows
    summary.value = summaryRow
  } catch (error) {
    console.error('Failed to load reserves:', error)
    loadError.value = 'Failed to load reserves.'
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingReserve.value = null
  form.value = defaultForm()
  form.value.accountId = accountOptions.value[0]?.value ?? null
  saveError.value = null
  showModal.value = true
}

function openEditModal(reserve: Reserve) {
  editingReserve.value = reserve
  form.value = {
    name: reserve.name,
    accountId: reserve.accountId,
    targetAmount: reserve.targetAmount,
    currentReservedAmount: reserve.currentReservedAmount,
    contributionAmount: reserve.contributionAmount,
    contributionCadence: reserve.contributionCadence,
    actualPaymentCadence: reserve.actualPaymentCadence,
    nextDueDate: reserve.nextDueDate,
    category: reserve.category ?? '',
    status: reserve.status,
    notes: reserve.notes ?? '',
  }
  saveError.value = null
  showModal.value = true
}

async function saveReserve() {
  saveError.value = null
  if (!form.value.name.trim()) {
    saveError.value = 'Name is required.'
    return
  }
  if (!form.value.accountId) {
    saveError.value = 'Account is required.'
    return
  }
  if (form.value.targetAmount <= 0) {
    saveError.value = 'Target amount must be greater than 0.'
    return
  }

  saving.value = true
  try {
    const payload: Record<string, any> = {
      name: form.value.name,
      accountId: form.value.accountId,
      targetAmount: Number(form.value.targetAmount),
      contributionAmount: Number(form.value.contributionAmount || 0),
      contributionCadence: form.value.contributionCadence,
      actualPaymentCadence: form.value.actualPaymentCadence,
      nextDueDate: form.value.nextDueDate,
      category: form.value.category || null,
      status: form.value.status,
      notes: form.value.notes || null,
    }
    if (!editingReserve.value) {
      payload.currentReservedAmount = Number(form.value.currentReservedAmount || 0)
      await $fetch('/api/reserves', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/reserves/${editingReserve.value.id}`, { method: 'PATCH', body: payload })
    }
    showModal.value = false
    await loadAll()
  } catch (error: any) {
    saveError.value = error?.data?.message ?? 'Failed to save reserve.'
  } finally {
    saving.value = false
  }
}

function openMovementModal(reserve: Reserve, type: MovementType) {
  selectedReserve.value = reserve
  movementForm.value = {
    date: todayISO,
    amount: type === 'contribution' ? reserve.contributionAmount : 0,
    type,
    notes: '',
  }
  movementError.value = null
  showMovementModal.value = true
}

async function saveMovement() {
  if (!selectedReserve.value) return
  movementError.value = null
  if (movementForm.value.amount <= 0) {
    movementError.value = 'Amount must be greater than 0.'
    return
  }

  savingMovement.value = true
  try {
    await $fetch('/api/reserves/movements', {
      method: 'POST',
      body: {
        reserveId: selectedReserve.value.id,
        date: movementForm.value.date,
        amount: Number(movementForm.value.amount),
        type: movementForm.value.type,
        notes: movementForm.value.notes || null,
      },
    })
    showMovementModal.value = false
    await loadAll()
  } catch (error: any) {
    movementError.value = error?.data?.message ?? 'Failed to save movement.'
  } finally {
    savingMovement.value = false
  }
}

async function openHistoryModal(reserve: Reserve) {
  selectedReserve.value = reserve
  movements.value = []
  showHistoryModal.value = true
  loadingMovements.value = true
  try {
    movements.value = await $fetch(`/api/reserves/${reserve.id}/movements`)
  } catch (error) {
    console.error('Failed to load movements:', error)
  } finally {
    loadingMovements.value = false
  }
}

function confirmDelete(reserve: Reserve) {
  deletingReserve.value = reserve
  showDeleteModal.value = true
}

async function deleteReserve() {
  if (!deletingReserve.value) return
  deleting.value = true
  try {
    await $fetch(`/api/reserves/${deletingReserve.value.id}`, { method: 'DELETE' })
    showDeleteModal.value = false
    deletingReserve.value = null
    await loadAll()
  } catch (error: any) {
    loadError.value = error?.data?.message ?? 'Failed to delete reserve.'
  } finally {
    deleting.value = false
  }
}

async function setStatus(reserve: Reserve, status: ReserveStatus) {
  await $fetch(`/api/reserves/${reserve.id}`, { method: 'PATCH', body: { status } })
  await loadAll()
}

async function autoAccrue() {
  accruing.value = true
  try {
    await $fetch('/api/reserves/accrue', { method: 'POST', body: { throughDate: todayISO } })
    await loadAll()
  } catch (error: any) {
    loadError.value = error?.data?.message ?? 'Failed to auto-accrue reserves.'
  } finally {
    accruing.value = false
  }
}

function statusLabel(status: ReserveStatus) {
  return { active: 'Active', paused: 'Paused', completed: 'Completed' }[status]
}

function statusColor(status: ReserveStatus): 'success' | 'warning' | 'neutral' {
  return { active: 'success', paused: 'warning', completed: 'neutral' }[status]
}

function cadenceLabel(cadence: ContributionCadence | PaymentCadence) {
  return {
    monthly: 'month',
    biweekly: '2 weeks',
    weekly: 'week',
    quarterly: 'quarter',
    annual: 'year',
    custom: 'custom',
  }[cadence]
}

function movementTypeLabel(type: MovementType) {
  return { contribution: 'Contribution', release: 'Release', adjustment: 'Adjustment' }[type]
}

function movementTypeColor(type: MovementType): 'success' | 'warning' | 'neutral' {
  return { contribution: 'success', release: 'warning', adjustment: 'neutral' }[type]
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(loadAll)
</script>
