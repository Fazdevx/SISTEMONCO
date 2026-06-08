import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mammographyApi } from '../../../services/api';
import { Mamografia } from '../../types';
import toast from 'react-hot-toast';

export const useMammographyStats = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mammographyStats', filters],
    queryFn: async () => {
      const { data } = await mammographyApi.getStats(filters);
      return data;
    },
  });
};

export const useMammographiesList = (page: number, limit: number, filters: any) => {
  return useQuery({
    queryKey: ['mammographies', { page, limit, filters }],
    queryFn: async () => {
      const { data } = await mammographyApi.getAll(page, limit, filters);
      return data;
    },
  });
};

export const usePositiveCases = (page: number, limit: number, filters: any) => {
  return useQuery({
    queryKey: ['positiveCases', { page, limit, filters }],
    queryFn: async () => {
      const { data } = await mammographyApi.getAll(page, limit, filters);
      return data;
    },
  });
};

export const useMammographyExport = (filters: any) => {
  return useQuery({
    queryKey: ['mammographyExport', filters],
    queryFn: async () => {
      const { data } = await mammographyApi.export(filters);
      return data;
    },
    enabled: false, // Disparado manualmente
  });
};

export const useMutateMammography = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Mamografia> }) => {
      if (id) {
        const res = await mammographyApi.update(id, data);
        return res.data;
      }
      const res = await mammographyApi.create(data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['mammographyStats'] });
      queryClient.invalidateQueries({ queryKey: ['mammographies'] });
      queryClient.invalidateQueries({ queryKey: ['positiveCases'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar la solicitud');
    }
  });
};
