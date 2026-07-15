import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { ImportSessionStatus } from '@prisma/client';
import {
  PipelineError,
  PipelineStats,
} from '../interfaces/pipeline-context.interface';

@Injectable()
export class ImportSessionService {
  constructor(private readonly prisma: DatabaseService) {}

  async createSession(
    systemId: string,
    filename: string,
    type = 'GTFS_STATIC',
  ) {
    return this.prisma.importSession.create({
      data: {
        systemId,
        filename,
        type,
        status: ImportSessionStatus.RUNNING,
        startedAt: new Date(),
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        recordsSkipped: 0,
        errorsCount: 0,
        warningsCount: 0,
      },
    });
  }

  async addErrors(sessionId: string, errors: PipelineError[]) {
    if (errors.length === 0) return;

    const data = errors.map((err) => ({
      sessionId,
      file: err.file,
      line: err.line || null,
      message: err.message,
      severity: err.severity,
      rawData: err.rawData || null,
    }));

    await this.prisma.importError.createMany({
      data,
    });
  }

  async completeSession(
    sessionId: string,
    status: ImportSessionStatus,
    stats: Record<string, PipelineStats>,
    errorsCount: number,
    warningsCount: number,
    report: Record<string, any>,
  ) {
    const session = await this.prisma.importSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - session.startedAt.getTime();

    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
    let recordsSkipped = 0;

    // Create audit logs for each entity operation
    const auditData: any[] = [];

    Object.entries(stats).forEach(([entity, stat]) => {
      recordsProcessed += stat.processed;
      recordsInserted += stat.inserted;
      recordsUpdated += stat.updated;
      recordsDeleted += stat.deleted;
      recordsSkipped += stat.skipped;

      if (stat.inserted > 0) {
        auditData.push({
          sessionId,
          entity,
          operation: 'INSERT',
          count: stat.inserted,
        });
      }
      if (stat.updated > 0) {
        auditData.push({
          sessionId,
          entity,
          operation: 'UPDATE',
          count: stat.updated,
        });
      }
      if (stat.deleted > 0) {
        auditData.push({
          sessionId,
          entity,
          operation: 'DELETE',
          count: stat.deleted,
        });
      }
    });

    await this.prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status,
        finishedAt,
        duration,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsDeleted,
        recordsSkipped,
        errorsCount,
        warningsCount,
        report,
      },
    });

    if (auditData.length > 0) {
      await this.prisma.importAudit.createMany({
        data: auditData,
      });
    }
  }

  async getSessions() {
    return this.prisma.importSession.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        system: { select: { name: true } },
      },
    });
  }

  async getSessionReport(id: string) {
    return this.prisma.importSession.findUnique({
      where: { id },
      include: {
        errors: true,
        audits: true,
      },
    });
  }
}
