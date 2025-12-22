export type EvidenceItem =
  | { kind: "source"; label: string; value: string; href?: string }
  | { kind: "timestamp"; label: string; value: string }
  | { kind: "input"; label: string; value: string }
  | { kind: "note"; label: string; value: string };

export interface EvidenceMeta {
  asOf?: string;
  isMock?: boolean;
  missingInputs?: string[];
  cacheAgeMs?: number;
}
