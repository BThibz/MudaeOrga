export default function GroupBadge({ name, color }) {
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[100px]"
      style={{ backgroundColor: color + '33', color }}
      title={name}
    >
      {name}
    </span>
  );
}
