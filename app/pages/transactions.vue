<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
      <UButton label="Add Transaction" color="primary" icon="i-heroicons-plus" @click="openAddModal" />
    </div>

    <!-- Add Transaction Modal -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Add Transaction</p>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchase Date <span class="text-red-500">*</span></label>
                <input
                  v-model="newTx.transactionDate"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type <span class="text-red-500">*</span></label>
                <select
                  v-model="newTx.type"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <optgroup label="Expenses (Debit)">
                    <option value="Purchase">Purchase</option>
                    <option value="Installment">Installment / Recurring</option>
                    <option value="Fee">Bank Fee</option>
                  </optgroup>
                  <optgroup label="Income (Credit)">
                    <option value="Payment">Payment Received</option>
                    <option value="Credit">Refund / Credit</option>
                    <option value="Adjustment">Adjustment</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <!-- Pending + Clearing Date -->
            <div class="grid grid-cols-2 gap-4 items-end">
              <div class="flex items-center gap-2.5 h-full pt-1">
                <input
                  id="newTxIsPending"
                  v-model="newTx.isPending"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label for="newTxIsPending" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Pending (not yet cleared)
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clearing Date</label>
                <input
                  v-model="newTx.clearingDate"
                  type="date"
                  :disabled="newTx.isPending"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description <span class="text-red-500">*</span></label>
              <input
                v-model="newTx.description"
                type="text"
                placeholder="e.g. Coffee at Blue Bottle"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($) <span class="text-red-500">*</span></label>
                <input
                  v-model="newTx.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Always enter a positive value — the sign is set automatically from the type.</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Account <span class="text-red-500">*</span></label>
                <select
                  v-model="newTx.accountId"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option :value="null" disabled>Select account…</option>
                  <option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Merchant</label>
                <input
                  v-model="newTx.merchantName"
                  type="text"
                  placeholder="e.g. Blue Bottle Coffee"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchased By</label>
                <input
                  v-model="newTx.purchasedBy"
                  type="text"
                  placeholder="e.g. Jonathan"
                  list="purchasers-list"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="purchasers-list">
                  <option v-for="person in uniquePurchasers" :key="person" :value="person" />
                </datalist>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                v-model="newTx.categoryId"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No Category</option>
                <template v-for="parent in categoryTree" :key="parent.id">
                  <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                    <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
                  </optgroup>
                  <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
                </template>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                v-model="newTx.notes"
                rows="2"
                placeholder="Optional notes…"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <p v-if="addError" class="text-sm text-red-500">{{ addError }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showAddModal = false" />
              <UButton label="Add Transaction" color="primary" :loading="addLoading" @click="submitTransaction" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Transaction Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Delete Transaction</p>
          </template>
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this transaction?
            </p>
            <div class="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
              <p class="font-medium text-gray-800 dark:text-gray-100">{{ deletingTransaction?.description }}</p>
              <p class="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                {{ formatDate(deletingTransaction?.transactionDate) }} &middot; {{ formatCurrency(Math.abs(deletingTransaction?.amount ?? 0)) }}
              </p>
            </div>
            <p class="text-xs text-red-500 dark:text-red-400">This cannot be undone.</p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteModal = false" />
              <UButton label="Delete" color="error" :loading="deleteLoading" @click="deleteTransaction" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Edit Transaction Modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Edit Transaction</p>
          </template>

          <div class="space-y-4">
            <!-- Date + Type -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchase Date</label>
                <input
                  v-model="editForm.transactionDate"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                <select
                  v-model="editForm.type"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <optgroup label="Expenses (Debit)">
                    <option value="Purchase">Purchase</option>
                    <option value="Installment">Installment / Recurring</option>
                    <option value="Fee">Bank Fee</option>
                  </optgroup>
                  <optgroup label="Income (Credit)">
                    <option value="Payment">Payment Received</option>
                    <option value="Credit">Refund / Credit</option>
                    <option value="Adjustment">Adjustment</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Transfer">Transfer</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <!-- Pending + Clearing Date -->
            <div class="grid grid-cols-2 gap-4 items-end">
              <div class="flex items-center gap-2.5 h-full pt-1">
                <input
                  id="editFormIsPending"
                  v-model="editForm.isPending"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label for="editFormIsPending" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Pending (not yet cleared)
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clearing Date</label>
                <input
                  v-model="editForm.clearingDate"
                  type="date"
                  :disabled="editForm.isPending"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <input
                v-model="editForm.description"
                type="text"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <!-- Amount + Purchased By -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($)</label>
                <input
                  v-model="editForm.amount"
                  type="number"
                  step="0.01"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchased By</label>
                <input
                  v-model="editForm.purchasedBy"
                  type="text"
                  list="edit-purchasers-list"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="edit-purchasers-list">
                  <option v-for="person in uniquePurchasers" :key="person" :value="person" />
                </datalist>
              </div>
            </div>

            <!-- Merchant combobox -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Merchant</label>
              <div class="relative">
                <input
                  v-model="editForm.merchantInputValue"
                  type="text"
                  placeholder="Search or create merchant…"
                  autocomplete="off"
                  class="w-full px-3 py-2 pr-8 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  @input="onMerchantInput"
                  @focus="showMerchantDropdown = true"
                  @blur="onMerchantBlur"
                  @keydown.escape="showMerchantDropdown = false"
                />
                <button
                  v-if="editForm.merchantInputValue"
                  type="button"
                  tabindex="-1"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click="clearMerchant"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                </button>

                <!-- Dropdown -->
                <div
                  v-if="showMerchantDropdown && (filteredMerchants.length > 0 || (editForm.merchantInputValue.trim() && !exactMerchantMatch))"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
                >
                  <button
                    v-for="m in filteredMerchants"
                    :key="m.id"
                    type="button"
                    class="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    @mousedown.prevent="selectMerchant(m)"
                  >
                    {{ m.normalizedName }}
                  </button>
                  <button
                    v-if="editForm.merchantInputValue.trim() && !exactMerchantMatch"
                    type="button"
                    class="w-full px-3 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium border-t border-gray-100 dark:border-gray-800"
                    @mousedown.prevent="createNewMerchant"
                  >
                    <UIcon name="i-heroicons-plus-circle" class="w-3.5 h-3.5 inline mr-1" />
                    Create "{{ editForm.merchantInputValue.trim() }}"
                  </button>
                </div>
              </div>

              <!-- New merchant indicator -->
              <p v-if="editForm.merchantIsNew && editForm.merchantInputValue" class="mt-1 text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                <UIcon name="i-heroicons-plus-circle" class="w-3.5 h-3.5" />
                New merchant will be created
              </p>

              <!-- Smart toggle: apply merchant change to all -->
              <div
                v-if="merchantChanged && editOriginal.merchantId !== null"
                class="mt-2 flex items-start gap-2.5 p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <input
                  id="applyMerchantAll"
                  v-model="applyMerchantToAll"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                />
                <label for="applyMerchantAll" class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed cursor-pointer">
                  Apply to all transactions from <strong>{{ editOriginal.merchantName }}</strong>
                  <span class="text-amber-600 dark:text-amber-400 block mt-0.5">
                    {{ editForm.merchantIsNew
                      ? `Creates "${editForm.merchantInputValue}" and moves all transactions.`
                      : `Merges into "${editForm.merchantInputValue}" and updates future imports.` }}
                  </span>
                </label>
              </div>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                v-model="editForm.categoryId"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No Category</option>
                <template v-for="parent in categoryTree" :key="parent.id">
                  <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                    <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
                  </optgroup>
                  <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
                </template>
              </select>

              <!-- Smart toggle: create category rule -->
              <div
                v-if="categoryChanged && (editForm.merchantId !== null || editForm.merchantIsNew)"
                class="mt-2 flex items-start gap-2.5 p-2.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
              >
                <input
                  id="createCategoryRule"
                  v-model="createCategoryRule"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                />
                <label for="createCategoryRule" class="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed cursor-pointer">
                  Always categorize <strong>{{ editForm.merchantInputValue || 'this merchant' }}</strong> as <strong>{{ editCategoryName }}</strong>
                  <span class="text-indigo-600 dark:text-indigo-400 block mt-0.5">Creates a rule and applies it to all existing transactions from this merchant.</span>
                </label>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                v-model="editForm.notes"
                rows="2"
                placeholder="Optional notes…"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <p v-if="editError" class="text-sm text-red-500">{{ editError }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showEditModal = false" />
              <UButton label="Save Changes" color="primary" :loading="editLoading" @click="saveEdit" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search description..."
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @input="debouncedLoadTransactions"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Category</label>
          <select
            v-model="filters.categoryId"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Categories</option>
            <template v-for="parent in categoryTree" :key="parent.id">
              <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
              </optgroup>
              <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
            </template>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Purchased By</label>
          <select
            v-model="filters.purchasedBy"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All</option>
            <option v-for="person in uniquePurchasers" :key="person" :value="person">{{ person }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Type</label>
          <select
            v-model="filters.type"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Types</option>
            <option value="Purchase">Purchase</option>
            <option value="Payment">Payment</option>
            <option value="Installment">Installment</option>
          </select>
        </div>

        <div v-if="availableAccounts.length > 0">
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Account</label>
          <select
            v-model="filters.accountId"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Accounts</option>
            <option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2.5 flex-wrap">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Showing <span class="font-semibold text-gray-700 dark:text-gray-200">{{ transactions.length }}</span> of <span class="font-semibold text-gray-700 dark:text-gray-200">{{ total }}</span> transactions
          </p>
          <!-- Active date chip from calendar -->
          <span
            v-if="filters.date"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-3 h-3 flex-shrink-0" />
            {{ formatDateDisplay(filters.date) }}
            <button
              class="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              @click="filters.date = null; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
          <!-- Active date range chip from chart click -->
          <span
            v-if="filters.startDate && filters.endDate"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-3 h-3 flex-shrink-0" />
            {{ formatDateDisplay(filters.startDate) }} – {{ formatDateDisplay(filters.endDate) }}
            <button
              class="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              @click="filters.startDate = null; filters.endDate = null; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
          <!-- Active merchant chip -->
          <span
            v-if="filters.merchantId"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-medium"
          >
            <UIcon name="i-heroicons-building-storefront" class="w-3 h-3 flex-shrink-0" />
            {{ filters.merchantName || 'Merchant' }}
            <button
              class="ml-0.5 p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
              @click="filters.merchantId = null; filters.merchantName = null; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
          <!-- Uncategorized-only chip -->
          <span
            v-if="filters.uncategorizedOnly"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium"
          >
            <UIcon name="i-heroicons-tag" class="w-3 h-3 flex-shrink-0" />
            Uncategorized
            <button
              class="ml-0.5 p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
              @click="filters.uncategorizedOnly = false; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
          <!-- Active amount sign chip -->
          <span
            v-if="filters.amountSign"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium"
            :class="filters.amountSign === 'debit'
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'"
          >
            <UIcon
              :name="filters.amountSign === 'debit' ? 'i-heroicons-arrow-trending-down' : 'i-heroicons-arrow-trending-up'"
              class="w-3 h-3 flex-shrink-0"
            />
            {{ filters.amountSign === 'debit' ? 'Spend' : 'Income' }}
            <button
              class="ml-0.5 p-0.5 rounded-full transition-colors"
              :class="filters.amountSign === 'debit' ? 'hover:bg-red-200 dark:hover:bg-red-800' : 'hover:bg-emerald-200 dark:hover:bg-emerald-800'"
              @click="filters.amountSign = null; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UButton label="Export CSV" color="neutral" variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" @click="exportCsv" />
          <UButton label="Clear Filters" color="neutral" variant="ghost" size="sm" @click="clearFilters" />
        </div>
      </div>
    </UCard>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
    </div>

    <!-- Transactions Table -->
    <UCard v-else>
      <div class="overflow-x-auto -mx-4 sm:-mx-6">
        <table class="w-full min-w-[700px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Merchant</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purchased By</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Account</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
              <th class="px-3 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="transaction in transactions"
              :key="transaction.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
              @click="openEditModal(transaction)"
            >
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {{ formatDate(transaction.transactionDate) }}
              </td>
              <td class="px-6 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-[200px]">
                <span class="block truncate" :title="transaction.description">{{ transaction.description }}</span>
                <span
                  v-if="transaction.isPending"
                  class="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                >
                  Pending
                </span>
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {{ transaction.merchant?.name || '—' }}
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm" @click.stop>
                <select
                  :value="transaction.category?.id ? String(transaction.category.id) : ''"
                  class="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-transparent text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
                  @change="(e) => updateCategory(transaction.id, (e.target as HTMLSelectElement).value)"
                >
                  <option value="">Uncategorized</option>
                  <template v-for="parent in categoryTree" :key="parent.id">
                    <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                      <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
                    </optgroup>
                    <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
                  </template>
                </select>
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {{ transaction.purchasedBy }}
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm">
                <span
                  v-if="transaction.account"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  :style="{ backgroundColor: transaction.account.color }"
                >
                  {{ transaction.account.name }}
                </span>
              </td>
              <td
                class="px-6 py-3 whitespace-nowrap text-sm text-right font-semibold tabular-nums"
                :class="transaction.amount >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-900 dark:text-white'"
              >
                {{ transaction.amount >= 0 ? '+' : '' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-right" @click.stop>
                <button
                  class="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete transaction"
                  @click="confirmDeleteTransaction(transaction)"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="transactions.length === 0" class="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
          No transactions found
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
        <UButton label="Previous" color="neutral" variant="outline" size="sm" :disabled="offset === 0" @click="previousPage" />
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Page <span class="font-semibold text-gray-800 dark:text-gray-200">{{ currentPage }}</span> of <span class="font-semibold text-gray-800 dark:text-gray-200">{{ totalPages }}</span>
        </span>
        <UButton label="Next" color="neutral" variant="outline" size="sm" :disabled="offset + limit >= total" @click="nextPage" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const loading = ref(true)
const transactions = ref<any[]>([])
const allCategories = ref<any[]>([])
const categoryTree = ref<any[]>([])
const total = ref(0)
const limit = ref(50)
const offset = ref(0)

// Add Transaction modal
const showAddModal = ref(false)
const addLoading = ref(false)
const addError = ref<string | null>(null)

// Delete Transaction modal
const showDeleteModal = ref(false)
const deletingTransaction = ref<any>(null)
const deleteLoading = ref(false)

// Edit Transaction modal
const showEditModal = ref(false)
const editingTransaction = ref<any>(null)
const editLoading = ref(false)
const editError = ref<string | null>(null)
const applyMerchantToAll = ref(false)
const createCategoryRule = ref(false)
const showMerchantDropdown = ref(false)
const allMerchants = ref<Array<{ id: number, normalizedName: string, rawNames: string[] }>>([])

function defaultEditForm() {
  return {
    transactionDate: '',
    clearingDate: '' as string,
    type: '',
    description: '',
    amount: 0 as number,
    merchantId: null as number | null,
    merchantInputValue: '',
    merchantIsNew: false,
    categoryId: '' as string,
    purchasedBy: '',
    notes: '',
    isPending: false,
  }
}

const editForm = ref(defaultEditForm())
const editOriginal = ref({
  merchantId: null as number | null,
  merchantName: '',
  categoryId: '' as string,
})

function defaultNewTx() {
  return {
    transactionDate: new Date().toISOString().split('T')[0],
    clearingDate: '' as string,
    description: '',
    type: 'Purchase',
    amount: null as number | null,
    accountId: null as number | null,
    merchantName: '',
    purchasedBy: '',
    categoryId: '' as string,
    notes: '',
    isPending: false,
  }
}

const newTx = ref(defaultNewTx())

function openAddModal() {
  newTx.value = defaultNewTx()
  addError.value = null
  showAddModal.value = true
}

async function submitTransaction() {
  addError.value = null
  if (!newTx.value.transactionDate || !newTx.value.description || !newTx.value.type || newTx.value.amount == null || !newTx.value.accountId) {
    addError.value = 'Please fill in all required fields.'
    return
  }

  addLoading.value = true
  try {
    await $fetch('/api/transactions', {
      method: 'POST',
      body: {
        accountId: newTx.value.accountId,
        transactionDate: newTx.value.transactionDate,
        clearingDate: (!newTx.value.isPending && newTx.value.clearingDate) ? newTx.value.clearingDate : undefined,
        description: newTx.value.description,
        type: newTx.value.type,
        amount: Number(newTx.value.amount),
        merchantName: newTx.value.merchantName || undefined,
        purchasedBy: newTx.value.purchasedBy || undefined,
        categoryId: newTx.value.categoryId ? Number(newTx.value.categoryId) : undefined,
        notes: newTx.value.notes || undefined,
        isPending: newTx.value.isPending,
      },
    })
    showAddModal.value = false
    offset.value = 0
    await loadTransactions()
  } catch (err: any) {
    addError.value = err?.data?.message ?? 'Failed to add transaction.'
  } finally {
    addLoading.value = false
  }
}

function confirmDeleteTransaction(tx: any) {
  deletingTransaction.value = tx
  showDeleteModal.value = true
}

async function deleteTransaction() {
  if (!deletingTransaction.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/transactions/${deletingTransaction.value.id}`, { method: 'DELETE' })
    showDeleteModal.value = false
    transactions.value = transactions.value.filter(t => t.id !== deletingTransaction.value.id)
    total.value = Math.max(0, total.value - 1)
  } catch (err: any) {
    console.error('Failed to delete transaction:', err)
  } finally {
    deleteLoading.value = false
  }
}

const filters = ref({
  search: null as string | null,
  categoryId: route.query.categoryId ? String(route.query.categoryId) : null as string | null,
  merchantId: route.query.merchantId ? Number(route.query.merchantId) : null as number | null,
  merchantName: route.query.merchantName ? String(route.query.merchantName) : null as string | null,
  amountSign: (route.query.amountSign === 'debit' || route.query.amountSign === 'credit') ? route.query.amountSign as 'debit' | 'credit' : null as 'debit' | 'credit' | null,
  uncategorizedOnly: route.query.uncategorizedOnly === 'true',
  purchasedBy: null as string | null,
  type: null as string | null,
  accountId: route.query.accountId ? Number(route.query.accountId) : null as number | null,
  date: route.query.date ? String(route.query.date) : null as string | null,
  startDate: route.query.startDate ? String(route.query.startDate) : null as string | null,
  endDate: route.query.endDate ? String(route.query.endDate) : null as string | null,
})

const uniquePurchasers = ref<string[]>([])
const availableAccounts = ref<any[]>([])

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit.value))

const merchantChanged = computed(() => {
  if (editForm.value.merchantIsNew) return true
  return editForm.value.merchantId !== editOriginal.value.merchantId
})

const categoryChanged = computed(() => {
  return editForm.value.categoryId !== editOriginal.value.categoryId
})

const filteredMerchants = computed(() => {
  const q = editForm.value.merchantInputValue.toLowerCase().trim()
  if (!q) return allMerchants.value.slice(0, 10)
  return allMerchants.value
    .filter(m => m.normalizedName.toLowerCase().includes(q))
    .slice(0, 10)
})

const exactMerchantMatch = computed(() => {
  const q = editForm.value.merchantInputValue.trim().toLowerCase()
  return allMerchants.value.some(m => m.normalizedName.toLowerCase() === q)
})

const editCategoryName = computed(() => {
  if (!editForm.value.categoryId) return 'No Category'
  const id = Number(editForm.value.categoryId)
  const cat = allCategories.value.find((c: any) => c.id === id)
  return cat?.name ?? 'selected category'
})


async function loadTransactions() {
  loading.value = true
  try {
    const params: any = { limit: limit.value, offset: offset.value }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.categoryId) params.categoryId = Number(filters.value.categoryId)
    if (filters.value.merchantId) params.merchantId = filters.value.merchantId
    if (filters.value.amountSign) params.amountSign = filters.value.amountSign
    if (filters.value.uncategorizedOnly) params.uncategorizedOnly = 'true'
    if (filters.value.purchasedBy) params.purchasedBy = filters.value.purchasedBy
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.accountId) params.accountId = filters.value.accountId
    if (filters.value.date) params.date = filters.value.date
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const data = await $fetch('/api/transactions', { params })
    transactions.value = data.transactions
    total.value = data.total
  } catch (error) {
    console.error('Failed to load transactions:', error)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const data = await $fetch('/api/categories')
    // Exclude the seeded "Uncategorized" category — dropdowns already have a
    // hardcoded blank option for "no category", so showing it twice is confusing.
    allCategories.value = data.categories.filter((c: any) => c.name.toLowerCase() !== 'uncategorized')
    categoryTree.value = data.tree.filter((c: any) => c.name.toLowerCase() !== 'uncategorized')
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

async function loadPurchasers() {
  try {
    const data = await $fetch('/api/transactions/stats')
    uniquePurchasers.value = data.spendByPurchaser.map((p: any) => p.purchasedBy).filter(Boolean)
  } catch (error) {
    console.error('Failed to load purchasers:', error)
  }
}

async function loadAccounts() {
  try {
    availableAccounts.value = await $fetch('/api/accounts')
  } catch (error) {
    console.error('Failed to load accounts:', error)
  }
}

async function loadMerchants() {
  try {
    allMerchants.value = await $fetch('/api/merchants') as any[]
  } catch (error) {
    console.error('Failed to load merchants:', error)
  }
}

function openEditModal(tx: any) {
  editingTransaction.value = tx
  editError.value = null
  applyMerchantToAll.value = false
  createCategoryRule.value = false
  showMerchantDropdown.value = false

  editForm.value = {
    transactionDate: tx.transactionDate ?? '',
    clearingDate: tx.clearingDate ?? '',
    type: tx.type ?? 'Purchase',
    description: tx.description ?? '',
    amount: tx.amount ?? 0,
    merchantId: tx.merchant?.id ?? null,
    merchantInputValue: tx.merchant?.name ?? '',
    merchantIsNew: false,
    categoryId: tx.category?.id ? String(tx.category.id) : '',
    purchasedBy: tx.purchasedBy ?? '',
    notes: tx.notes ?? '',
    isPending: tx.isPending ?? false,
  }

  editOriginal.value = {
    merchantId: tx.merchant?.id ?? null,
    merchantName: tx.merchant?.name ?? '',
    categoryId: tx.category?.id ? String(tx.category.id) : '',
  }

  showEditModal.value = true
}

function onMerchantInput() {
  editForm.value.merchantId = null
  editForm.value.merchantIsNew = false
  showMerchantDropdown.value = true
}

function selectMerchant(m: { id: number, normalizedName: string }) {
  editForm.value.merchantId = m.id
  editForm.value.merchantInputValue = m.normalizedName
  editForm.value.merchantIsNew = false
  showMerchantDropdown.value = false
}

function createNewMerchant() {
  editForm.value.merchantId = null
  editForm.value.merchantIsNew = true
  showMerchantDropdown.value = false
}

function clearMerchant() {
  editForm.value.merchantId = null
  editForm.value.merchantInputValue = ''
  editForm.value.merchantIsNew = false
  showMerchantDropdown.value = false
}

function onMerchantBlur() {
  // Small delay so mousedown on dropdown items fires first
  setTimeout(() => {
    showMerchantDropdown.value = false
    // If the typed value doesn't match any merchant and isn't a new merchant, reset to original
    if (!editForm.value.merchantIsNew && editForm.value.merchantId === null && editForm.value.merchantInputValue) {
      const match = allMerchants.value.find(m =>
        m.normalizedName.toLowerCase() === editForm.value.merchantInputValue.toLowerCase(),
      )
      if (match) {
        editForm.value.merchantId = match.id
        editForm.value.merchantInputValue = match.normalizedName
      }
    }
  }, 150)
}

async function saveEdit() {
  if (!editingTransaction.value) return
  editError.value = null
  editLoading.value = true

  try {
    let finalMerchantId = editForm.value.merchantId

    // Step 1: Handle merchant merge (apply to all)
    if (merchantChanged.value && applyMerchantToAll.value && editOriginal.value.merchantId !== null) {
      const mergeBody: Record<string, any> = {
        sourceMerchantId: editOriginal.value.merchantId,
      }
      if (editForm.value.merchantIsNew) {
        mergeBody.newMerchantName = editForm.value.merchantInputValue.trim()
      } else if (editForm.value.merchantId) {
        mergeBody.targetMerchantId = editForm.value.merchantId
      } else {
        mergeBody.newMerchantName = editForm.value.merchantInputValue.trim()
      }
      const merged = await $fetch('/api/merchants/merge', { method: 'POST', body: mergeBody }) as any
      finalMerchantId = merged.id
    } else if (merchantChanged.value && editForm.value.merchantIsNew && editForm.value.merchantInputValue.trim()) {
      // Step 2: Create new merchant (no merge)
      const created = await $fetch('/api/merchants', {
        method: 'POST',
        body: { name: editForm.value.merchantInputValue.trim() },
      }) as any
      finalMerchantId = created.id
    }

    // Step 3: Create category rule + apply to existing
    if (categoryChanged.value && createCategoryRule.value && editForm.value.categoryId) {
      const merchantForRule = finalMerchantId ?? editingTransaction.value.merchant?.id ?? null
      const merchantName = editForm.value.merchantIsNew
        ? editForm.value.merchantInputValue.trim()
        : (editForm.value.merchantInputValue || editingTransaction.value.merchant?.name || '')

      await $fetch('/api/merchant-rules', {
        method: 'POST',
        body: {
          pattern: merchantName.toLowerCase(),
          categoryId: Number(editForm.value.categoryId),
          applyToExisting: true,
          merchantId: merchantForRule,
        },
      })
    }

    // Step 4: PATCH the transaction with all field changes
    const patch: Record<string, any> = {}
    const orig = editingTransaction.value

    if (editForm.value.transactionDate !== orig.transactionDate)
      patch.transactionDate = editForm.value.transactionDate
    if (editForm.value.type !== orig.type)
      patch.type = editForm.value.type
    if (editForm.value.description !== orig.description)
      patch.description = editForm.value.description
    if (Number(editForm.value.amount) !== orig.amount)
      patch.amount = Number(editForm.value.amount)
    if (finalMerchantId !== (orig.merchant?.id ?? null))
      patch.merchantId = finalMerchantId
    const newCatId = editForm.value.categoryId ? Number(editForm.value.categoryId) : null
    const origCatId = orig.category?.id ?? null
    if (newCatId !== origCatId)
      patch.categoryId = newCatId
    if ((editForm.value.purchasedBy || '') !== (orig.purchasedBy || ''))
      patch.purchasedBy = editForm.value.purchasedBy || null
    if ((editForm.value.notes || '') !== (orig.notes || ''))
      patch.notes = editForm.value.notes || null
    if (editForm.value.isPending !== (orig.isPending ?? false))
      patch.isPending = editForm.value.isPending
    const newClearingDate = (!editForm.value.isPending && editForm.value.clearingDate) ? editForm.value.clearingDate : null
    if (newClearingDate !== (orig.clearingDate ?? null))
      patch.clearingDate = newClearingDate

    if (Object.keys(patch).length > 0) {
      await $fetch(`/api/transactions/${editingTransaction.value.id}`, {
        method: 'PATCH',
        body: patch,
      })
    }

    showEditModal.value = false
    await loadTransactions()
    // Refresh merchants list in case new ones were created
    await loadMerchants()
  } catch (err: any) {
    editError.value = err?.data?.message ?? 'Failed to save changes.'
  } finally {
    editLoading.value = false
  }
}

async function updateCategory(transactionId: number, value: string) {
  const categoryId = value ? Number(value) : null
  try {
    await $fetch(`/api/transactions/${transactionId}`, {
      method: 'PATCH',
      body: { categoryId },
    })
    // Optimistic local update — no full reload needed
    const tx = transactions.value.find(t => t.id === transactionId)
    if (tx) {
      tx.category = categoryId
        ? allCategories.value.find(c => c.id === categoryId) ?? null
        : null
    }
  } catch (error) {
    console.error('Failed to update category:', error)
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

function clearFilters() {
  filters.value = { search: null, categoryId: null, merchantId: null, merchantName: null, amountSign: null, uncategorizedOnly: false, purchasedBy: null, type: null, accountId: null, date: null, startDate: null, endDate: null }
  offset.value = 0
  loadTransactions()
}

function formatDateDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function nextPage() {
  offset.value += limit.value
  loadTransactions()
}

function previousPage() {
  offset.value = Math.max(0, offset.value - limit.value)
  loadTransactions()
}

let debounceTimer: NodeJS.Timeout | null = null
function debouncedLoadTransactions() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    offset.value = 0
    loadTransactions()
  }, 500)
}

function exportCsv() {
  const params = new URLSearchParams()
  if (filters.value.search) params.set('search', filters.value.search)
  if (filters.value.categoryId) params.set('categoryId', String(Number(filters.value.categoryId)))
  if (filters.value.merchantId) params.set('merchantId', String(filters.value.merchantId))
  if (filters.value.amountSign) params.set('amountSign', filters.value.amountSign)
  if (filters.value.uncategorizedOnly) params.set('uncategorizedOnly', 'true')
  if (filters.value.purchasedBy) params.set('purchasedBy', filters.value.purchasedBy)
  if (filters.value.type) params.set('type', filters.value.type)
  if (filters.value.accountId) params.set('accountId', String(filters.value.accountId))
  if (filters.value.date) params.set('date', filters.value.date)
  if (filters.value.startDate) params.set('startDate', filters.value.startDate)
  if (filters.value.endDate) params.set('endDate', filters.value.endDate)
  window.open(`/api/export/transactions?${params.toString()}`, '_self')
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadPurchasers(), loadAccounts(), loadTransactions(), loadMerchants()])
})
</script>
