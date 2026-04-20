import { useUIStore } from '../store/useUIStore.js';
import { useGroups } from '../hooks/useGroups.js';

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useUIStore();
  const { viewMode, setViewMode } = useUIStore();
  const { data: groups = [] } = useGroups();

  const hasFilters =
    filters.series || filters.group_id || filters.kakera_min || filters.kakera_max;

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-gray-800 border-b border-gray-700">
      <input
        type="text"
        placeholder="Série…"
        value={filters.series}
        onChange={(e) => setFilters({ series: e.target.value })}
        className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-discord w-40"
      />

      <select
        value={filters.group_id ?? ''}
        onChange={(e) =>
          setFilters({ group_id: e.target.value ? Number(e.target.value) : null })
        }
        className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-discord"
      >
        <option value="">Tous les groupes</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="Kakera min"
          value={filters.kakera_min}
          onChange={(e) => setFilters({ kakera_min: e.target.value })}
          className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-discord w-28"
        />
        <span className="text-gray-400">—</span>
        <input
          type="number"
          placeholder="Kakera max"
          value={filters.kakera_max}
          onChange={(e) => setFilters({ kakera_max: e.target.value })}
          className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-discord w-28"
        />
      </div>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="text-xs text-gray-400 hover:text-white underline"
        >
          Réinitialiser
        </button>
      )}

      <div className="ml-auto flex gap-1">
        <button
          onClick={() => setViewMode('grid')}
          title="Grille"
          className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-discord text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <GridIcon />
        </button>
        <button
          onClick={() => setViewMode('list')}
          title="Liste"
          className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-discord text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <ListIcon />
        </button>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}
