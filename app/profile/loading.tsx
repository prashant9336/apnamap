export default function ProfileLoading() {
  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#05070C" }}>
      {/* Avatar + name */}
      <div className="flex items-center gap-4 pt-4">
        <div className="w-16 h-16 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded-lg shimmer w-2/5" />
          <div className="h-4 rounded-lg shimmer w-3/5" />
        </div>
      </div>
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-2xl shimmer" />
        <div className="h-16 rounded-2xl shimmer" />
        <div className="h-16 rounded-2xl shimmer" />
      </div>
      {/* Menu items */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-14 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
