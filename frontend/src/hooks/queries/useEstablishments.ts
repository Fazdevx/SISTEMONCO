import { useQuery } from '@tanstack/react-query';
import { establishmentApi } from '../../../services/api';

export const useEstablecimientos = () => {
  return useQuery({
    queryKey: ['establecimientos'],
    queryFn: async () => {
      const { data } = await establishmentApi.getEstablecimientos();
      return data;
    },
  });
};

export const useMicroredes = () => {
  return useQuery({
    queryKey: ['microredes'],
    queryFn: async () => {
      const { data } = await establishmentApi.getMicroredes();
      return data;
    },
  });
};
