import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const COMPANY_ID = "1"; // TODO: pull from user context after onboarding

// ── Pools ──────────────────────────────────────────────────────────────────────
export function usePools() {
  return useQuery({
    queryKey: ["pools", COMPANY_ID],
    queryFn: async () => {
      const res = await fetch(`/api/pools?companyId=${COMPANY_ID}`);
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json() as Promise<{ pools: any[] }>;
    },
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: COMPANY_ID }),
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
  return useQuery({
    queryKey: ["reports", poolId ?? COMPANY_ID],
    queryFn: async () => {
      const url = poolId
        ? `/api/reports?poolId=${poolId}`
        : `/api/reports?companyId=${COMPANY_ID}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
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
  return useQuery({
    queryKey: ["invoices", COMPANY_ID],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?companyId=${COMPANY_ID}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: COMPANY_ID }),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
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
