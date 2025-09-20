export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="loader"></div>
    </div>
  );
}