import type { SafeVectorDocumentV1 } from 'writer-notebook/core';
import type { PageRotation } from 'writer-notebook/core';
import { useTranslation } from 'react-i18next';

interface SafeVectorPageProps {
  readonly document: SafeVectorDocumentV1;
  readonly pageNumber: number;
  readonly rotation: PageRotation;
}

export const SafeVectorPage = ({ document, pageNumber, rotation }: SafeVectorPageProps) => {
  const { t } = useTranslation('screens');
  return (
    <svg
      role="img"
      aria-label={t('notebook.vectorPage', { page: pageNumber })}
      viewBox={`0 0 ${String(document.width)} ${String(document.height)}`}
      style={{ transform: `rotate(${String(rotation)}deg)` }}
      className="max-h-full max-w-full border border-rule bg-paper"
    >
      <g aria-hidden="true">
        {document.paths.map((path, index) => <path key={index} d={path.d} fill={path.fill} />)}
      </g>
    </svg>
  );
};
