import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class CsvReaderService {
  async readCsv(
    filePath: string,
    onRow: (row: Record<string, string>, lineNum: number) => Promise<void>,
    onError?: (err: Error, lineNum: number) => void,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let headers: string[] = [];
    let isFirstLine = true;
    let lineNum = 0;

    for await (const line of rl) {
      lineNum++;
      try {
        if (isFirstLine) {
          isFirstLine = false;
          headers = this.parseCsvLine(line);
          continue;
        }

        const values = this.parseCsvLine(line);
        if (values.length === 0 || (values.length === 1 && values[0] === '')) {
          continue;
        }

        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length; i++) {
          row[headers[i]] = values[i] || '';
        }

        await onRow(row, lineNum);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err, lineNum);
        }
      }
    }
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map((val) => val.replace(/^"|"$/g, '').trim());
  }
}
