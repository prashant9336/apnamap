export default function SearchLoading() {
  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#05070C" }}>
      <div className="h-12 rounded-2xl shimmer" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
