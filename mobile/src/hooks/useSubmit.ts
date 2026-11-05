import { useState, useRef, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import Toast from 'react-native-toast-message';
import { ApiError } from '../api/client';

export interface UseSubmitOptions<TResult> {
  successMessage?: string | ((result: TResult) => string);
  onSuccess?: (result: TResult) => void;
  onError?: (error: ApiError) => void;
  showErrorToast?: boolean;
}

export function useSubmit<TArgs = any, TResult = any>(
  submitFn: (args: TArgs, idempotencyKey: string) => Promise<TResult>,
  options: UseSubmitOptions<TResult> = {}
) {
  const { successMessage, onSuccess, onError, showErrorToast = true } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const currentKeyRef = useRef<string | null>(null);

  const submit = useCallback(
    async (args: TArgs): Promise<TResult | null> => {
      if (isSubmitting) return null;

      setIsSubmitting(true);
      setError(null);

      // Generate a new key if not reusing after a NETWORK_ERROR
      if (!currentKeyRef.current) {
        currentKeyRef.current = Crypto.randomUUID();
      }
      const key = currentKeyRef.current;

      try {
        const result = await submitFn(args, key);

        // After success, clear the key so next submission generates a fresh UUID
        currentKeyRef.current = null;
        setIsSubmitting(false);

        if (successMessage) {
          const msg = typeof successMessage === 'function' ? successMessage(result) : successMessage;
          Toast.show({
            type: 'success',
            text1: msg,
            position: 'top',
            visibilityTime: 3000,
          });
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err: any) {
        setIsSubmitting(false);
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(0, 'UNKNOWN_ERROR', err?.message || 'Submission failed');

        setError(apiError);

        // CLAUDE.md: "reused only when retrying after a network failure, a new one after any server response"
        if (apiError.code !== 'NETWORK_ERROR') {
          currentKeyRef.current = null;
        }

        if (showErrorToast) {
          Toast.show({
            type: 'error',
            text1: apiError.message,
            position: 'top',
            visibilityTime: 4000,
          });
        }

        if (onError) {
          onError(apiError);
        }

        throw apiError;
      }
    },
    [isSubmitting, submitFn, successMessage, onSuccess, onError, showErrorToast]
  );

  return {
    submit,
    isSubmitting,
    error,
    resetError: () => setError(null),
  };
}
