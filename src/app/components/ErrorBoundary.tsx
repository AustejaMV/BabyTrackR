import { useRouteError, isRouteErrorResponse, Link } from "react-router";

/** For use as errorElement in React Router. Renders a friendly message and "Back to Home". */
export function ErrorBoundaryFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.data?.message ?? error.statusText ?? "Something went wrong"
    : error instanceof Error
      ? error.message
      : "Something went wrong";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--bg)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
    >
      <div className="max-w-md w-full rounded-2xl border p-6 text-center" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--tx)" }}>
          Something went wrong
        </h1>
        <p className="text-[15px] mb-4" style={{ color: "var(--mu)" }}>
          We hit an unexpected error. You can go back home and try again.
        </p>
        <p className="text-[13px] mb-4 p-2 rounded-lg break-all" style={{ background: "var(--bg2)", color: "var(--mu)" }}>
          {String(message)}
        </p>
        <Link
          to="/"
          className="inline-block py-3 px-6 rounded-xl text-[15px] font-medium text-white min-h-[48px] leading-[48px]"
          style={{ background: "var(--pink)" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
