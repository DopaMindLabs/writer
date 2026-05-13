import { Navigate, useParams } from 'react-router-dom';

export function FocusScreen() {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  if (!spaceId || !docId) return <Navigate to="/" replace />;
  return <Navigate to={`/s/${spaceId}/d/${docId}?focus=1`} replace />;
}
