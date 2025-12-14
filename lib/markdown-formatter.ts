/**
 * Markdown Formatter Utility
 * Lightweight, zero-dependency formatter for markdown output
 */

/**
 * Format a single record as markdown KV (code block style)
 * @param record Object to format
 * @param title Optional title for the record
 * @returns Markdown KV string
 */
export function formatKV(record: Record<string, any>, title?: string): string {
  const lines: string[] = [];

  if (title) {
    lines.push(`## ${title}`);
    lines.push('');
  }

  lines.push('```');
  for (const [key, value] of Object.entries(record)) {
    const displayValue = formatValue(value);
    lines.push(`${key}: ${displayValue}`);
  }
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format multiple records as a markdown table
 * @param records Array of objects to format
 * @param columns Optional column configuration (order, rename, filter)
 * @returns Markdown table string
 */
export function formatTable(
  records: Record<string, any>[],
  columns?: { key: string; label?: string }[]
): string {
  if (records.length === 0) {
    return '_No records_';
  }

  // Determine columns from first record if not specified
  const cols = columns || Object.keys(records[0]).map(key => ({ key, label: key }));

  const lines: string[] = [];

  // Header row
  const headers = cols.map(c => c.label || c.key);
  lines.push(`| ${headers.join(' | ')} |`);

  // Separator row
  lines.push(`| ${cols.map(() => '---').join(' | ')} |`);

  // Data rows
  for (const record of records) {
    const values = cols.map(c => escapeTableCell(formatValue(record[c.key])));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format value for display (handles undefined, null, arrays, objects)
 */
function formatValue(value: any): string {
  if (value === undefined || value === null) {
    return '-';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  return String(value);
}

/**
 * Escape pipe characters in table cells
 */
function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Format records - auto-selects KV for single, table for multiple
 * @param records Single record or array of records
 * @param options Formatting options
 * @returns Markdown string
 */
export function format(
  records: Record<string, any> | Record<string, any>[],
  options?: {
    title?: string;
    columns?: { key: string; label?: string }[];
    forceTable?: boolean;
  }
): string {
  const { title, columns, forceTable = false } = options || {};

  // Handle array
  if (Array.isArray(records)) {
    if (records.length === 0) {
      return '_No records_';
    }
    if (records.length === 1 && !forceTable) {
      return formatKV(records[0], title);
    }
    return formatTable(records, columns);
  }

  // Handle single record
  return formatKV(records, title);
}