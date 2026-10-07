/** Ambient aurora + film grain behind every page. */
export function Backdrop() {
  return (
    <>
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="grain" aria-hidden />
    </>
  );
}
