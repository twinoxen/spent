export type ExportFormat = 'csv'

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  // Wrap in double-quotes if the value contains a comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Serialize an array of rows to a CSV string.
 *
 * @param rows    - Array of data objects.
 * @param columns - Column definitions: a header label and a value accessor per column.
 * @returns UTF-8 CSV string with a BOM prefix so Excel opens it correctly.
 */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map(c => escapeCsvField(c.header)).join(',')
  const body = rows
    .map(row => columns.map(c => escapeCsvField(c.value(row))).join(','))
    .join('\n')
  // UTF-8 BOM ensures Excel reads the file without character encoding issues
  return `\uFEFF${header}\n${body}`
}
