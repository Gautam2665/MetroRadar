import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');

@Injectable()
export class ArchiveService {
  extractZip(zipBuffer: Buffer, destDir: string): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(destDir, true);
  }
}
