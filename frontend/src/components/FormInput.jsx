import Input from './common/Input';
import Select from './common/Select';
import { cn } from '../utils/cn';

export default function FormInput({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  options = [],
  error,
  helperText,
  required = false,
  rows = 3,
  className = '',
  inputClassName = '',
  ...props
}) {
  if (type === 'select') {
    return (
      <Select
        label={label}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        options={options}
        error={error}
        helperText={helperText}
        required={required}
        wrapperClassName={className}
        selectClassName={inputClassName}
        {...props}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <div className={cn('stves-form-textarea-group w-full', className)}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </label>
        )}

        <textarea
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            'stves-form-textarea w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-800 transition-all',
            'placeholder:text-gray-400 focus:outline-none focus:ring-4',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-gray-200 focus:border-[#0f4c81] focus:ring-[#0f4c81]/15',
            inputClassName
          )}
          {...props}
        />

        {(error || helperText) && (
          <p className={cn('mt-1.5 text-xs', error ? 'text-red-600' : 'text-gray-400')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }

  return (
    <Input
      type={type}
      label={label}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      required={required}
      wrapperClassName={className}
      inputClassName={inputClassName}
      {...props}
    />
  );
}