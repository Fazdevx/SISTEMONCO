import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../../services/api';

export const usePatientHistory = (dni: string | null) => {
  return useQuery({
    queryKey: ['patientHistory', dni],
    queryFn: async () => {
      const { data } = await patientApi.getHistory(dni!);
      return data;
    },
    enabled: !!dni,
    retry: false, // Do not retry on 404
  });
};
