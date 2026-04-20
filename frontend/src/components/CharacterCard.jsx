import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GroupBadge from './GroupBadge.jsx';
import { useGroups } from '../hooks/useGroups.js';
import { useSetGroup, useDeleteCharacter } from '../hooks/useCharacters.js';
import { useState } from 'react';

export default function CharacterCard({ character, listMode = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: character.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const { data: groups = [] } = useGroups();
  const setGroup = useSetGroup();
  const deleteChar = useDeleteCharacter();
  const [menuOpen, setMenuOpen] = useState(false);

  const groupColors = {};
  groups.forEach((g) => (groupColors[g.id] = g.color));

  if (listMode) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded hover:border-gray-500 group"
      >
        <button {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-gray-300">
          <DragHandle />
        </button>
        <img
          src={character.image_url}
          alt={character.name}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
          onError={(e) => { e.target.src = '/placeholder.png'; }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{character.name}</p>
          <p className="text-xs text-gray-400 truncate">{character.series}</p>
        </div>
        {character.kakera > 0 && (
          <span className="text-xs text-yellow-400 font-mono flex-shrink-0">
            ✦ {character.kakera}
          </span>
        )}
        <div className="flex gap-1 flex-wrap">
          {character.group_names?.map((name, i) => (
            <GroupBadge key={i} name={name} color={groupColors[character.group_ids[i]] ?? '#6366f1'} />
          ))}
        </div>
        <GroupMenu
          character={character}
          groups={groups}
          setGroup={setGroup}
          deleteChar={deleteChar}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-500 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 cursor-grab text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-0.5"
      >
        <DragHandle />
      </button>

      <div className="absolute top-1 right-1 z-10">
        <GroupMenu
          character={character}
          groups={groups}
          setGroup={setGroup}
          deleteChar={deleteChar}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>

      <img
        src={character.image_url}
        alt={character.name}
        className="w-full aspect-[3/4] object-cover"
        onError={(e) => { e.target.src = '/placeholder.png'; }}
      />

      <div className="p-2">
        <p className="font-semibold text-white text-sm truncate" title={character.name}>
          {character.name}
        </p>
        <p className="text-xs text-gray-400 truncate mb-1" title={character.series}>
          {character.series}
        </p>
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {character.group_names?.map((name, i) => (
              <GroupBadge key={i} name={name} color={groupColors[character.group_ids[i]] ?? '#6366f1'} />
            ))}
          </div>
          {character.kakera > 0 && (
            <span className="text-xs text-yellow-400 font-mono">✦ {character.kakera}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupMenu({ character, groups, setGroup, deleteChar, menuOpen, setMenuOpen }) {
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="p-1 rounded bg-black/60 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        title="Options"
      >
        <DotsIcon />
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-6 z-20 w-44 bg-gray-900 border border-gray-700 rounded shadow-xl text-sm"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <p className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wide">Groupe</p>
          <button
            onClick={() => { setGroup.mutate({ id: character.id, group_id: null }); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-gray-300"
          >
            Aucun
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setGroup.mutate({ id: character.id, group_id: g.id }); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
              <span className="truncate" style={{ color: g.color }}>{g.name}</span>
            </button>
          ))}
          <div className="border-t border-gray-700 mt-1">
            <button
              onClick={() => { if (confirm(`Supprimer ${character.name} ?`)) deleteChar.mutate(character.id); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-red-400"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DragHandle() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 16a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </svg>
  );
}
