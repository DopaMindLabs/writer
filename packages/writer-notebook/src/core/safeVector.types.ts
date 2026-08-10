export interface SafeVectorPath {
  readonly d: string;
  readonly fill: string;
}

export interface SafeVectorDocumentV1 {
  readonly version: 1;
  readonly width: number;
  readonly height: number;
  readonly paths: readonly SafeVectorPath[];
}
