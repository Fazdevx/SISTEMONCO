import { useMutation, useQueryClient } from "@tanstack/react-query";
import { establishmentApi } from "../../../services/api"; // Asumo que establishmentApi existe y tiene el método updateMeta

interface UpdateMetaPayload {
  id: string; // o number, dependiendo de tu backend
  meta: number;
}

export const useUpdateEstablishmentMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, meta }: UpdateMetaPayload) => {
      // Llamamos a la API para actualizar la meta.
      const response = await establishmentApi.updateMeta(id, meta);
      return response.data; // Devuelve la respuesta del backend si es necesario
    },
    onSuccess: () => {
      // Invalida la caché para que useMammographyStats se actualice automáticamente
      queryClient.invalidateQueries({ queryKey: ["mammographyStats"] });
      // Si tienes otro hook para listar establecimientos, invalida su caché también
      queryClient.invalidateQueries({ queryKey: ["establecimientos"] });
      console.log("Meta actualizada exitosamente.");
      // Podrías añadir un toast de éxito aquí
    },
    onError: (error: any) => {
      console.error("Error al actualizar meta:", error);
      // Podrías mostrar un toast de error aquí
      // Por ejemplo: toast.error("Error al actualizar meta: " + error.response?.data?.error || error.message);
    },
  });
};
