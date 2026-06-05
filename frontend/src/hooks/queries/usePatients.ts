import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '../../../services/api';
import toast from 'react-hot-toast';

export const usePatientHistory = (dni: string | null) => {
  return useQuery({
    queryKey: ['patientHistory', dni],
    queryFn: async () => {
      const { data } = await patientApi.getHistory(dni!);
      return data;
    },
    enabled: !!dni,
    retry: false,
  });
};

export const usePatients = (page: number, limit: number, search: string) => {
  return useQuery({
    queryKey: ['patients', { page, limit, search }],
    queryFn: async () => {
      const { data } = await patientApi.getAll(page, limit, search);
      return data;
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await patientApi.update(id, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Paciente actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar paciente');
    }
  });
};
