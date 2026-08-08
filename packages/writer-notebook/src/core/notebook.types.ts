export interface Notebook {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type PageRotation = 0 | 90 | 180 | 270;

export interface VectorisationProvenance {
  readonly engine: string;
  readonly engineVersion: string;
  readonly preset: string;
  readonly presetVersion: number;
}

export interface NotebookPage {
  readonly id: string;
  readonly notebookId: string;
  readonly order: number;
  readonly sourceAssetId: string;
  readonly thumbnailAssetId: string;
  readonly vectorAssetId?: string;
  readonly width: number;
  readonly height: number;
  readonly rotation: PageRotation;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly vectorisation?: VectorisationProvenance;
}

export type NotebookAssetKind = 'source' | 'thumbnail' | 'vector';

export interface NotebookAsset {
  readonly id: string;
  readonly notebookId: string;
  readonly pageId: string;
  readonly kind: NotebookAssetKind;
  readonly mime: string;
  readonly size: number;
  readonly blob: Blob;
  readonly createdAt: number;
}

export interface NotebookAssetInput {
  readonly mime: string;
  readonly blob: Blob;
}

export interface AddPageInput {
  readonly notebookId: string;
  readonly source: NotebookAssetInput;
  readonly thumbnail: NotebookAssetInput;
  readonly width: number;
  readonly height: number;
}

export interface AttachVectorInput {
  readonly pageId: string;
  readonly vector: NotebookAssetInput;
  readonly vectorisation: VectorisationProvenance;
}
