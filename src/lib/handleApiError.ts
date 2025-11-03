import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

export interface ApiErrorDetails {
  message: string;
  status?: number;
  code?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
}

/**
 * Trata erros de API de forma robusta
 */
export function handleApiError(
  error: unknown,
  context?: {
    endpoint?: string;
    method?: string;
    userId?: string;
    showToast?: boolean;
  }
): ApiErrorDetails {
  const showToast = context?.showToast !== false;
  let message = 'Erro desconhecido';
  let status: number | undefined;
  let code: string | undefined;
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    status = axiosError.response?.status;
    const data = axiosError.response?.data as any;
    const endpoint = context?.endpoint || axiosError.config?.url || 'unknown';
    const method = context?.method || axiosError.config?.method?.toUpperCase() || 'unknown';
    
    if (axiosError.response) {
      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.errors) {
        if (Array.isArray(data.errors)) {
          message = data.errors
            .map((err: any) => {
              if (typeof err === 'string') return err;
              if (err.message) return err.message;
              if (err.field && err.message) return `${err.field}: ${err.message}`;
              return JSON.stringify(err);
            })
            .join(', ');
        } else if (typeof data.errors === 'object') {
          const fieldErrors = Object.entries(data.errors)
            .map(([field, messages]: [string, any]) => {
              const msgs = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${msgs}`;
            })
            .join('; ');
          message = fieldErrors || JSON.stringify(data.errors);
        }
      } else {
        message = `Erro do servidor (${status || 'unknown'}): ${axiosError.message}`;
      }
      
      code = data?.code || data?.errorCode;
    } else if (axiosError.request) {
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    } else {
      message = `Erro ao processar requisição: ${axiosError.message}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error) || 'Erro desconhecido';
  }
  
  if (showToast) {
    toast.error(message, {
      duration: status && status >= 500 ? 6000 : 4000,
    });
  }
  
  return {
    message,
    status,
    code,
    endpoint: context?.endpoint,
    method: context?.method,
    userId: context?.userId,
  };
}

