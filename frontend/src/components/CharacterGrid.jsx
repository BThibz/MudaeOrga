import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCharacters, useReorder } from '../hooks/useCharacters.js';
import { useUIStore } from '../store/useUIStore.js';
import CharacterCard from './CharacterCard.jsx';

export default function CharacterGrid() {
  const { data: serverChars = [], isLoading, isError } = useCharacters();
  const { optimisticOrder, setOptimisticOrder, viewMode } = useUIStore();
  const reorder = useReorder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const characters = optimisticOrder
    ? optimisticOrder
        .map((id) => serverChars.find((c) => c.id === id))
        .filter(Boolean)
    : serverChars;

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = characters.findIndex((c) => c.id === active.id);
    const newIndex = characters.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(characters, oldIndex, newIndex);

    setOptimisticOrder(reordered.map((c) => c.id));
    reorder.mutate(reordered.map((c) => c.id));
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Chargement…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Erreur lors du chargement des personnages.
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
        <p className="text-lg">Aucun personnage</p>
        <p className="text-sm">Lance <code className="bg-gray-700 px-1 rounded">$mm</code> sur Discord puis utilise la commande <code className="bg-gray-700 px-1 rounded">/sync</code> du bot.</p>
      </div>
    );
  }

  const isGrid = viewMode === 'grid';
  const strategy = isGrid ? rectSortingStrategy : verticalListSortingStrategy;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={characters.map((c) => c.id)} strategy={strategy}>
        <div
          className={
            isGrid
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4'
              : 'flex flex-col gap-1 p-4'
          }
        >
          {characters.map((char) => (
            <CharacterCard key={char.id} character={char} listMode={!isGrid} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
