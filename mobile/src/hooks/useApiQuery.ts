import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '../api/client';

export function useApiQuery<T>(queryFn: () => Promise<T>, options: { enabled?: boolean; deps?: any[] } = {}) {
  const { enabled = true, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await queryFnRef.current();
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new ApiError(0, 'UNKNOWN_ERROR', err?.message || 'An error occurred'));
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        fetchData();
      }
    }, [enabled, fetchData, ...deps])
  );

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    isRefreshing,
    error,
    refetch,
    setData,
  };
}
