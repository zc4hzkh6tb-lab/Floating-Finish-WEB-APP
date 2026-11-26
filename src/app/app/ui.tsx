export const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 mt-6 px-4 text-lg font-bold">{children}</h2>;
export const Box = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-4 mb-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 ${className}`}>{children}</div>
);
export const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-4 text-sm text-neutral-500">{children}</p>;
