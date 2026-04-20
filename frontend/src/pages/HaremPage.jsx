import Header from '../components/Header.jsx';
import FilterBar from '../components/FilterBar.jsx';
import GroupSidebar from '../components/GroupSidebar.jsx';
import CharacterGrid from '../components/CharacterGrid.jsx';
import GroupModal from '../components/GroupModal.jsx';

export default function HaremPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      <Header />
      <FilterBar />
      <div className="flex flex-1 overflow-hidden">
        <GroupSidebar />
        <main className="flex-1 overflow-y-auto">
          <CharacterGrid />
        </main>
      </div>
      <GroupModal />
    </div>
  );
}
