import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers.list(),
  });
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => api.providers.listModels(),
  });
}

export function useSetProviderKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      api.providers.setKey(provider, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}
