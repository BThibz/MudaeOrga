import { useState } from 'react';
import { useUIStore } from '../store/useUIStore.js';
import { useGroups, useCreateGroup, useDeleteGroup } from '../hooks/useGroups.js';

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
];

export default function GroupModal() {
  const { groupModalOpen, closeGroupModal } = useUIStore();
  const { data: groups = [] } = useGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  if (!groupModalOpen) return null;

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    createGroup.mutate(
      { name: name.trim(), color },
      { onSuccess: () => setName('') }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeGroupModal}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Gérer les groupes</h2>
          <button onClick={closeGroupModal} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 mb-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du groupe…"
            maxLength={50}
            className="flex-1 px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-discord"
          />
          <div className="flex gap-1 items-center">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={createGroup.isPending || !name.trim()}
            className="px-3 py-2 text-sm bg-discord hover:bg-discord-hover text-white rounded disabled:opacity-50"
          >
            Créer
          </button>
        </form>

        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {groups.length === 0 && (
            <li className="text-gray-400 text-sm text-center py-4">Aucun groupe</li>
          )}
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
              <span className="flex-1 text-sm text-white truncate">{g.name}</span>
              <button
                onClick={() => { if (confirm(`Supprimer le groupe "${g.name}" ?`)) deleteGroup.mutate(g.id); }}
                className="text-gray-500 hover:text-red-400 text-xs"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
