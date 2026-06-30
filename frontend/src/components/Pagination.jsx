export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'records',
}) {
  const totalPages = Math.max(1, Math.ceil(Number(totalItems || 0) / pageSize));
  const safePage = Math.min(Math.max(Number(currentPage || 1), 1), totalPages);
  const startItem = totalItems > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(safePage * pageSize, Number(totalItems || 0));

  if (totalItems === 0) {
    return (
      <div className="stves-pagination flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400">
        <p>Showing 0 of 0 {itemLabel}.</p>
      </div>
    );
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="stves-pagination flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400">
      <p>
        Showing {startItem}–{endItem} of {totalItems} {itemLabel}.
      </p>

      {totalPages > 1 && (
        <div className="stves-pagination-controls flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(safePage - 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-8 rounded-lg px-3 py-1.5 font-semibold ${
                safePage === page
                  ? 'bg-[#0f4c81] text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
