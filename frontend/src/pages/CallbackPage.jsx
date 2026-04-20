import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export default function CallbackPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    navigate('/', { replace: true });
  }, [navigate, qc]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Connexion en cours…
    </div>
  );
}
