export const PixelDivider = () => {
  return (
    <div
      aria-hidden="true"
      className="h-2 w-full"
      style={{
        background:
          "repeating-linear-gradient(90deg, #111 0 4px, transparent 4px 8px)",
      }}
    />
  );
};
