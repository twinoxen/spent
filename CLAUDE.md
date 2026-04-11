# Claude Code Instructions

## Nuxt UI Components — Always Fetch Live Docs

This project uses **Nuxt UI v4** (`@nuxt/ui ^4.5.0`). The v4 API differs significantly from v2/v3 — prop names, slot names, and event shapes changed. Do not rely on memory or prior experience with older versions.

**Before using ANY Nuxt UI component**, fetch its documentation page:

```
https://ui.nuxt.com/components/<component-name>
```

Examples:

| Component | Docs URL |
|-----------|----------|
| UModal | https://ui.nuxt.com/components/modal |
| UTable | https://ui.nuxt.com/components/table |
| UForm / UFormField | https://ui.nuxt.com/components/form |
| USelect | https://ui.nuxt.com/components/select |
| UInput | https://ui.nuxt.com/components/input |
| UButton | https://ui.nuxt.com/components/button |
| UCard | https://ui.nuxt.com/components/card |
| USwitch | https://ui.nuxt.com/components/switch |
| UBadge | https://ui.nuxt.com/components/badge |
| UAlert | https://ui.nuxt.com/components/alert |
| UTabs | https://ui.nuxt.com/components/tabs |
| UDropdownMenu | https://ui.nuxt.com/components/dropdown-menu |

**Never assume** prop names, slot names, or v-model bindings from memory. Always verify against the fetched documentation before writing component code.
