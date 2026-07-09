// Shared between the paginated list and the CSV export so an export always
// matches exactly what the admin was looking at on screen — never a silent
// "export everything" behind a filtered view.
export function buildInvoiceWhere(searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const search = searchParams.get("search")?.trim() ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  return {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(plan && plan !== "ALL" ? { plan } : {}),
    ...(search ? { barbershop: { name: { contains: search } } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {}),
  };
}
