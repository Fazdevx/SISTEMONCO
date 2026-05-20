import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../services/api';
import { Usuario } from '../../types';

export const useUsersList = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await userApi.getAll();
      return data;
    },
  });
};

export const useMutateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Usuario> }) => {
      if (id) {
        const res = await userApi.update(id, data);
        return res.data;
      }
      const res = await userApi.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string | number) => {
      await userApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
