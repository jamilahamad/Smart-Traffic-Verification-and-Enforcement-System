import LoadingSpinner from './LoadingSpinner';
import { cn } from '../../utils/cn';

const getValue = (row, accessor) => {
  if (!accessor) {
    return '';
  }

  if (typeof accessor === 'function') {
    return accessor(row);
  }

  return String(accessor)
    .split('.')
    .reduce((value, key) => {
      return value?.[key];
    }, row);
};

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  getRowKey,
  onRowClick,
  className = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName = '',
}) {
  const rows = Array.isArray(data) ? data : [];

  return (
    <div
      className={cn(
        'stves-table-wrapper overflow-hidden rounded-2xl border border-gray-100 bg-white',
        className
      )}
    >
      <div className="stves-table-scroll overflow-x-auto">
        <table className={cn('stves-table min-w-full divide-y divide-gray-100', tableClassName)}>
          <thead className={cn('stves-table-head bg-gray-50', headerClassName)}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key || column.accessor || column.header}
                  className={cn(
                    'stves-table-th whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500',
                    column.headerClassName
                  )}
                >
                  {column.header || column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="stves-table-body divide-y divide-gray-50 bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length || 1} className="px-4 py-12">
                  <LoadingSpinner text="Loading records..." />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="stves-table-empty px-4 py-12 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const rowKey =
                  typeof getRowKey === 'function'
                    ? getRowKey(row, rowIndex)
                    : row.id || row._id || rowIndex;

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'stves-table-row transition-colors hover:bg-gray-50',
                      onRowClick && 'cursor-pointer',
                      typeof rowClassName === 'function'
                        ? rowClassName(row, rowIndex)
                        : rowClassName
                    )}
                  >
                    {columns.map((column) => {
                      const value = getValue(row, column.accessor || column.key);

                      return (
                        <td
                          key={column.key || column.accessor || column.header}
                          className={cn(
                            'stves-table-td px-4 py-3 text-sm text-gray-700',
                            column.className
                          )}
                        >
                          {typeof column.render === 'function'
                            ? column.render(value, row, rowIndex)
                            : value || column.fallback || 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}