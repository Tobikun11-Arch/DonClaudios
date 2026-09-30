// The order view lives in the `@order` parallel slot, which the layout prefers
// over `children`. This stub is only the fallback if that slot is ever absent,
// and it deliberately renders nothing: it used to wrap a placeholder string in
// a second `<main>`, which nested a landmark inside the layout's own `<main>`.
export default function CustomerDashboard() {
  return null;
}