import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// ── Pools ──────────────────────────────────────────────────────────────────────
export function usePools() {
  const { company } = useAuth();
  return useQuery({
    queryKey: ["pools", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pools?companyId=${company!.id}`);
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json() as Promise<{ pools: any[] }>;
    },
    enabled: !!company?.id,
  });
}

export function usePool(id: number) {
  return useQuery({
    queryKey: ["pool", id],
    queryFn: async () => {
      const res = await fetch(`/api/pools/${id}`);
      if (!res.ok) throw new Error("Failed to fetch pool");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePool() {
  const { company } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: company!.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create pool");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pools"] }),
  });
}

export function useUpdatePool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, any>) => {
      const res = await fetch(`/api/pools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update pool");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["pools"] });
      qc.invalidateQueries({ queryKey: ["pool", id] });
    },
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────
export function useReports(poolId?: number) {
  const { company } = useAuth();
  return useQuery({
    queryKey: ["reports", poolId ?? company?.id],
    queryFn: async () => {
      const url = poolId
        ? `/api/reports?poolId=${poolId}`
        : `/api/reports?companyId=${company!.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: !!(poolId || company?.id),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create report");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export function useInvoices() {
  const { company } = useAuth();
  return useQuery({
    queryKey: ["invoices", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?companyId=${company!.id}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!company?.id,
  });
}

export function useCreateInvoice() {
  const { company } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: company!.id }),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, any>) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update invoice");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// ── Employees ─────────────────────────────────────────────────────────────────
export function useEmployees() {
  const { company } = useAuth();
  return useQuery({
    queryKey: ["employees", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/employees?companyId=${company!.id}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json() as Promise<{ employees: any[] }>;
    },
    enabled: !!company?.id,
  });
}

export function useCreateEmployee() {
  const { company } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: company!.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create employee");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { company } = useAuth();
  return useQuery({
    queryKey: ["analytics", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?companyId=${company!.id}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!company?.id,
  });
}

// ── Mileage ───────────────────────────────────────────────────────────────────
export function useMileage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mileage", user?.uid],
    queryFn: async () => {
      const res = await fetch(`/api/mileage?userId=${user!.uid}`);
      if (!res.ok) throw new Error("Failed to fetch mileage");
      return res.json();
    },
    enabled: !!user,
  });
}
