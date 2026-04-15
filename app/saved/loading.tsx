export default function SavedLoading() {
  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#05070C" }}>
      <div className="h-8 w-28 rounded-xl shimmer mt-2" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
