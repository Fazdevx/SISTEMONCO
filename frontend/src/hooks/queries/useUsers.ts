import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../services/api';
import { Usuario } from '../../types';
import toast from 'react-hot-toast';

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
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar el usuario');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string | number) => {
      await userApi.delete(id);
    },
    onSuccess: () => {
      toast.success('Usuario eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el usuario');
    }
  });
};
