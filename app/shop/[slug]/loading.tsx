export default function ShopLoading() {
  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#05070C" }}>
      {/* Header */}
      <div className="h-12 rounded-2xl shimmer" />
      {/* Cover */}
      <div className="h-48 rounded-2xl shimmer" />
      {/* Name + meta */}
      <div className="h-7 rounded-xl shimmer w-2/3" />
      <div className="h-4 rounded-lg shimmer w-1/2" />
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="h-12 rounded-xl shimmer" />
        <div className="h-12 rounded-xl shimmer" />
        <div className="h-12 rounded-xl shimmer" />
      </div>
      {/* Offer cards */}
      <div className="h-20 rounded-2xl shimmer" />
      <div className="h-20 rounded-2xl shimmer" />
    </div>
  );
}
