import { Search, Filter, RefreshCw } from 'lucide-react';

import Button from './common/Button';
import Input from './common/Input';
import Table from './common/Table';
import { cn } from '../utils/cn';

export default function DataTable({
  title,
  subtitle,
  columns = [],
  data = [],
  loading = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  activeFilter = '',
  onFilterChange,
  actions,
  onRefresh,
  emptyMessage = 'No records found.',
  getRowKey,
  onRowClick,
  className = '',
}) {
  return (
    <section className={cn('stves-data-table rounded-2xl border border-gray-100 bg-white', className)}>
      {(title || subtitle || actions || onRefresh) && (
        <header className="stves-data-table-header flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                loading={loading}
                leftIcon={RefreshCw}
              >
                Refresh
              </Button>
            )}

            {actions}
          </div>
        </header>
      )}

      {(onSearchChange || filters.length > 0) && (
        <div className="stves-data-table-toolbar flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          {onSearchChange && (
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              leftIcon={Search}
              wrapperClassName="lg:max-w-md"
            />
          )}

          {filters.length > 0 && (
            <div className="stves-data-table-filters flex flex-wrap items-center gap-2">
              <Filter size={16} className="text-gray-400" />

              {filters.map((filter) => {
                const value = typeof filter === 'string' ? filter : filter.value;
                const label = typeof filter === 'string' ? filter : filter.label;

                return (
                  <Button
                    key={value}
                    type="button"
                    variant={activeFilter === value ? 'primary' : 'secondary'}
                    size="xs"
                    onClick={() => onFilterChange?.(value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Table
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={emptyMessage}
        getRowKey={getRowKey}
        onRowClick={onRowClick}
        className="rounded-none border-0"
      />
    </section>
  );
}