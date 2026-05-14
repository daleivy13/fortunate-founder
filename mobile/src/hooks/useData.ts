import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useStore } from "../lib/store";

// ── Pools ──────────────────────────────────────────────────────────────────────
export function usePools() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["pools", company?.id],
    queryFn:  () => api.get<{ pools: any[] }>(`/api/pools?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

export function useCreatePool() {
  const company = useStore((s) => s.company);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.post("/api/pools", { ...data, companyId: company!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pools"] }),
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────
export function useReports(poolId?: number) {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["reports", poolId ?? company?.id],
    queryFn:  () => {
      const url = poolId
        ? `/api/reports?poolId=${poolId}`
        : `/api/reports?companyId=${company!.id}`;
      return api.get<{ reports: any[] }>(url);
    },
    enabled: !!(poolId || company?.id),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/reports", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

// ── Chemistry ─────────────────────────────────────────────────────────────────
export function useAnalyzeChemistry() {
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/chemistry/analyze", data),
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export function useInvoices() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["invoices", company?.id],
    queryFn:  () => api.get<{ invoices: any[] }>(`/api/invoices?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

// ── Routes / GPS ──────────────────────────────────────────────────────────────
export function useRoutes() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["routes", company?.id],
    queryFn:  () => api.get<{ routes: any[] }>(`/api/routes?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["analytics", company?.id],
    queryFn:  () => api.get(`/api/analytics?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

// ── Mileage ───────────────────────────────────────────────────────────────────
export function useMileage() {
  const user = useStore((s) => s.user);
  return useQuery({
    queryKey: ["mileage", user?.uid],
    queryFn:  () => api.get(`/api/mileage?userId=${user!.uid}`),
    enabled:  !!user?.uid,
  });
}

export function useLogMileage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/mileage", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mileage"] }),
  });
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export function useInventory() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["inventory", company?.id],
    queryFn:  () => api.get(`/api/inventory?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

// ── Invoices (create) ─────────────────────────────────────────────────────────
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/invoices", data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// ── Equipment ─────────────────────────────────────────────────────────────────
export function useEquipment(poolId?: number) {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["equipment", poolId ?? company?.id],
    queryFn:  () => {
      const url = poolId
        ? `/api/equipment?poolId=${poolId}`
        : `/api/equipment?companyId=${company!.id}`;
      return api.get<{ equipment: any[] }>(url);
    },
    enabled: !!(poolId || company?.id),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/equipment", data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

// ── Work Orders ───────────────────────────────────────────────────────────────
export function useWorkOrders() {
  const company = useStore((s) => s.company);
  return useQuery({
    queryKey: ["work-orders", company?.id],
    queryFn:  () => api.get<{ workOrders: any[] }>(`/api/work-orders?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/work-orders", data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

// ── Compliance ────────────────────────────────────────────────────────────────
export function useCompliance(poolId: number) {
  return useQuery({
    queryKey: ["compliance", poolId],
    queryFn:  () => api.get<{ status: any; events: any[] }>(`/api/compliance/${poolId}`),
    enabled:  !!poolId,
  });
}

// ── Photo damage analysis ─────────────────────────────────────────────────────
export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: (data: { imageBase64: string; poolId?: number; companyId?: number }) =>
      api.post("/api/photos/analyze", data),
  });
}

// ── Weather intelligence ──────────────────────────────────────────────────────
export function useWeather(address?: string, poolVolume?: number, lastCl?: number, lastCya?: number) {
  return useQuery({
    queryKey: ["weather", address],
    queryFn:  () => {
      const params = new URLSearchParams({ address: address! });
      if (poolVolume) params.set("vol", String(poolVolume));
      if (lastCl)     params.set("cl",  String(lastCl));
      if (lastCya)    params.set("cya", String(lastCya));
      return api.get<{ weather: any; intelligence: any; locationName: string }>(`/api/weather?${params}`);
    },
    enabled:   !!address,
    staleTime: 30 * 60 * 1000, // 30 min — weather doesn't change every second
    retry:     false,
  });
}

// ── Push tokens ───────────────────────────────────────────────────────────────
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (data: { userId: string; token: string; platform: string }) =>
      api.post("/api/push-tokens", data),
  });
}
