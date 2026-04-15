export default function ExploreLoading() {
  return (
    <div className="min-h-screen" style={{ background: "#05070C" }}>
      {/* Category bar */}
      <div className="flex gap-2 px-4 py-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-16 rounded-full shimmer flex-shrink-0" />
        ))}
      </div>
      {/* Locality label */}
      <div className="px-4 mb-2">
        <div className="h-5 w-32 rounded-lg shimmer" />
      </div>
      {/* Shop cards */}
      <div className="px-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  );
}
