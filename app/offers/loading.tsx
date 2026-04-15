export default function OffersLoading() {
  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#05070C" }}>
      <div className="h-8 w-28 rounded-xl shimmer mt-2" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-28 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
