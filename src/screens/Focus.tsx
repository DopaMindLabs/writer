import { Navigate, useParams } from 'react-router-dom';

export function FocusScreen() {
  const { worldId, docId } = useParams<{ worldId: string; docId: string }>();
  if (!worldId || !docId) return <Navigate to="/" replace />;
  return <Navigate to={`/w/${worldId}/d/${docId}?focus=1`} replace />;
}
