import { useGroups } from '../hooks/useGroups.js';
import { useUIStore } from '../store/useUIStore.js';

export default function GroupSidebar() {
  const { data: groups = [] } = useGroups();
  const { filters, setFilters, openGroupModal } = useUIStore();

  return (
    <aside className="w-48 flex-shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Groupes</span>
        <button
          onClick={openGroupModal}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Gérer les groupes"
        >
          +
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <button
          onClick={() => setFilters({ group_id: null })}
          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
            !filters.group_id
              ? 'bg-discord/20 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Tous
        </button>

        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setFilters({ group_id: g.id })}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
              filters.group_id === g.id
                ? 'bg-discord/20 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
            <span className="truncate">{g.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
