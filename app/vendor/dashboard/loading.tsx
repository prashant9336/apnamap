export default function VendorDashboardLoading() {
  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#05070C" }}>
      {/* Header */}
      <div className="h-14 rounded-2xl shimmer" />
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl shimmer" />
        <div className="h-20 rounded-2xl shimmer" />
        <div className="h-20 rounded-2xl shimmer" />
      </div>
      {/* Shop card */}
      <div className="h-40 rounded-2xl shimmer" />
      {/* Offers */}
      <div className="h-5 w-24 rounded-lg shimmer" />
      {[1, 2].map(i => (
        <div key={i} className="h-24 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
