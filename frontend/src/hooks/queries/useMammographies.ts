import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mammographyApi } from '../../../services/api';
import { Mamografia } from '../../types';

export const useMammographyStats = () => {
  return useQuery({
    queryKey: ['mammographyStats'],
    queryFn: async () => {
      const { data } = await mammographyApi.getStats();
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

export const usePositiveCases = (filters: any) => {
  return useQuery({
    queryKey: ['positiveCases', filters],
    queryFn: async () => {
      // Pedimos un límite alto y filtramos en frontend, o pasamos a backend
      const { data } = await mammographyApi.getAll(1, 1000, filters);
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mammographyStats'] });
      queryClient.invalidateQueries({ queryKey: ['mammographies'] });
      queryClient.invalidateQueries({ queryKey: ['positiveCases'] });
    },
  });
};
