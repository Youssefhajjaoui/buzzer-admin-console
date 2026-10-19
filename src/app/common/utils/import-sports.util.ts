import { SportDraft } from '../../core/models/catalogue.model';

export function parseSportsImport(fileName: string, text: string): SportDraft[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJson(trimmed);
  }

  return parseCsv(trimmed);
}

function parseJson(text: string): SportDraft[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((row) => draftFromRecord(asRecord(row)));
}

function parseCsv(text: string): SportDraft[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    return draftFromRecord(record);
  });
}

function draftFromRecord(record: Record<string, unknown>): SportDraft {
  const draft: SportDraft = { name: textValue(record, 'name') };
  const description = textValue(record, 'description');
  const iconUrl = textValue(record, 'iconurl') || textValue(record, 'iconUrl');
  if (description) {
    draft.description = description;
  }
  if (iconUrl) {
    draft.iconUrl = iconUrl;
  }
  return draft;
}

function textValue(record: Record<string, unknown>, key: string): string {
  const match = Object.entries(record).find(([entry]) => entry.toLowerCase() === key.toLowerCase());
  return match?.[1] == null ? '' : String(match[1]).trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells;
}
