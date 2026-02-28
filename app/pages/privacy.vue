<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Effective date: January 1, 2025 &nbsp;&bull;&nbsp; Twin Oxen LLC</p>
    </div>

    <div class="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
        <p>
          Spent is a personal finance visualization tool operated by <strong>Twin Oxen LLC</strong>. We are committed to
          collecting only the minimum information necessary to provide the service. This policy describes exactly what we
          store and why.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Information We Collect</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <strong>Email address</strong> — used solely to identify your account and allow you to sign in. We do not
            use your email for marketing and we do not share it with third parties.
          </li>
          <li>
            <strong>Transaction data you import</strong> — amounts, dates, merchant names, and any categories you
            assign. This is the core data the app is built around.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">What We Do Not Collect</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>No bank account numbers</strong> — we never store or transmit your account or routing numbers.</li>
          <li><strong>No passwords or PINs</strong> to any external financial institution.</li>
          <li><strong>No Social Security numbers</strong> or government-issued identifiers.</li>
          <li><strong>No payment card numbers</strong> or full card details.</li>
          <li>
            <strong>No personally identifiable financial account credentials</strong> of any kind beyond what you
            explicitly paste or upload as transaction records.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">How Your Data Is Used</h2>
        <p>Your data is used exclusively to:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Display your spending history, categories, and trends within the app.</li>
          <li>
            Suggest transaction categories using AI (OpenAI). When AI categorization is used, transaction descriptions
            and amounts may be sent to OpenAI's API. No personally identifying information beyond the transaction text
            itself is included in these requests.
          </li>
        </ul>
        <p class="mt-3">We do not sell, rent, or share your data with any third party for advertising or analytics purposes.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Data Retention</h2>
        <p>
          Your data is stored for as long as your account is active. You may request deletion of your account and all
          associated data at any time by contacting us.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Security</h2>
        <p>
          We take reasonable technical precautions to protect your data, including encrypted passwords (bcrypt) and
          JWT-based session tokens. However, no system is perfectly secure. Use the app at your own discretion.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Beta Notice</h2>
        <p>
          Spent is currently in beta. Features, data handling practices, and this policy may change as the product
          evolves. We will update this page when material changes are made.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
        <p>
          Questions about this policy? Reach out to Twin Oxen LLC through the contact details provided when you
          registered, or open an issue on our support channel.
        </p>
      </section>
    </div>

    <div class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
      <NuxtLink to="/" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">&larr; Back to app</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Privacy Policy — Spent' })
</script>
