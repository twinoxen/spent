<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Terms of Use</h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Effective date: January 1, 2025 &nbsp;&bull;&nbsp; Twin Oxen LLC</p>
    </div>

    <div class="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Acceptance of Terms</h2>
        <p>
          By creating an account or using Spent (the "Service"), operated by <strong>Twin Oxen LLC</strong>, you agree
          to these Terms of Use. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Description of Service</h2>
        <p>
          Spent is a personal finance visualization tool that allows you to import, categorize, and analyze your own
          financial transaction records. The Service is provided for personal, non-commercial use.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Your Data</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>You retain ownership of all transaction data you import into the Service.</li>
          <li>
            You are responsible for ensuring the data you upload is your own and that you have the right to process
            it with a third-party tool.
          </li>
          <li>
            We store only the transaction records you explicitly import and your email address. We do not store bank
            account numbers or any financial credentials. See our <NuxtLink to="/privacy" class="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</NuxtLink> for full details.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Use the Service for any unlawful purpose.</li>
          <li>Attempt to access another user's data.</li>
          <li>Reverse-engineer, scrape, or otherwise interfere with the Service.</li>
          <li>Upload data that contains malicious code or content.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">AI Features</h2>
        <p>
          The Service optionally uses OpenAI's API to suggest transaction categories. By using AI-assisted features, you
          acknowledge that transaction descriptions may be transmitted to OpenAI subject to
          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline">OpenAI's privacy policy</a>.
          No account numbers or personal identifiers are included in these requests.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Financial Advice</h2>
        <p>
          The Service is a visualization and organizational tool only. Nothing in the Service constitutes financial,
          investment, tax, or legal advice. Twin Oxen LLC is not a financial institution or registered advisor. Consult
          a qualified professional for financial decisions.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Disclaimer of Warranties</h2>
        <p>
          The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranty of any
          kind. Twin Oxen LLC makes no guarantees regarding uptime, accuracy, or fitness for a particular purpose.
          The Service is currently in beta and may change or become unavailable at any time.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Twin Oxen LLC shall not be liable for any indirect, incidental,
          special, or consequential damages arising from your use of the Service, including data loss.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service after changes are posted
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law provisions.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
        <p>
          For questions about these Terms, contact Twin Oxen LLC through the details provided at registration.
        </p>
      </section>
    </div>

    <div class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
      <NuxtLink to="/" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">&larr; Back to app</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Terms of Use — Spent' })
</script>
