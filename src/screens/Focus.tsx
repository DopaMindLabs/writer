import { Navigate, useParams } from 'react-router-dom';
import { routes } from '@/lib/routes';

export const FocusScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  if (!spaceId || !docId) return <Navigate to={routes.home()} replace />;
  return (
    <Navigate to={`${routes.docWrite(spaceId, docId)}?focus=1`} replace />
  );
};
