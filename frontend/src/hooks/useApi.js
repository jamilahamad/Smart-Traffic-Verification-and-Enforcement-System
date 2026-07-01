import { useCallback, useState } from 'react';

export default function useApi(asyncFunction, options = {}) {
  const { initialData = null, onSuccess, onError } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError('');

        const response = await asyncFunction(...args);

        setData(response);

        if (typeof onSuccess === 'function') {
          onSuccess(response);
        }

        return {
          success: true,
          data: response,
        };
      } catch (requestError) {
        const message = requestError.message || 'Request failed.';

        setError(message);

        if (typeof onError === 'function') {
          onError(requestError);
        }

        return {
          success: false,
          message,
          error: requestError,
        };
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, onError, onSuccess]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError('');
    setLoading(false);
  }, [initialData]);

  return {
    data,
    error,
    loading,
    isLoading: loading,
    execute,
    reset,
    setData,
    setError,
  };
}