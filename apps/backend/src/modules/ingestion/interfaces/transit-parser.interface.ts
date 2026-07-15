import { PipelineContext } from './pipeline-context.interface';

export interface TransitParser<RawRow> {
  parse(context: PipelineContext): Promise<RawRow[]>;
}

export interface TransitValidator<RawRow> {
  validate(context: PipelineContext, rows: RawRow[]): Promise<RawRow[]>;
}

export interface TransitNormalizer<RawRow, NormalizedRow> {
  normalize(context: PipelineContext, rows: RawRow[]): Promise<NormalizedRow[]>;
}

export interface TransitTransformer<NormalizedRow, DomainEntity> {
  transform(
    context: PipelineContext,
    rows: NormalizedRow[],
  ): Promise<DomainEntity[]>;
}
