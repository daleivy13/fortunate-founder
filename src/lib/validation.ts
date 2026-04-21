import { z } from "zod";

// ── Pool schemas ───────────────────────────────────────────────────────────────
export const CreatePoolSchema = z.object({
  companyId:     z.coerce.number().int().positive(),
  name:          z.string().min(1, "Pool name required").max(100),
  clientName:    z.string().max(100).optional().or(z.literal("")),
  clientEmail:   z.string().email("Invalid email").optional().or(z.literal("")),
  clientPhone:   z.string().max(30).optional(),
  address:       z.string().min(3, "Address required").max(200),
  lat:           z.coerce.number().min(-90).max(90).optional(),
  lng:           z.coerce.number().min(-180).max(180).optional(),
  type:          z.enum(["residential","commercial","hoa"]).default("residential"),
  volumeGallons: z.coerce.number().int().min(100).max(10000000).optional(),
  monthlyRate:   z.coerce.number().min(0).max(100000).optional(),
  serviceDay:    z.string().max(50).optional(),
  notes:         z.string().max(1000).optional(),
});

export const UpdatePoolSchema = CreatePoolSchema.partial().omit({ companyId: true });

// ── Report schemas ────────────────────────────────────────────────────────────
export const ChemReadingSchema = z.object({
  freeChlorine:     z.coerce.number().min(0).max(20).optional(),
  combinedChlorine: z.coerce.number().min(0).max(20).optional(),
  ph:               z.coerce.number().min(6.0).max(9.0).optional(),
  totalAlkalinity:  z.coerce.number().min(0).max(500).optional(),
  calciumHardness:  z.coerce.number().min(0).max(1000).optional(),
  cyanuricAcid:     z.coerce.number().min(0).max(300).optional(),
  salt:             z.coerce.number().min(0).max(10000).optional(),
  waterTemp:        z.coerce.number().min(32).max(120).optional(),
});

export const CreateReportSchema = z.object({
  poolId:           z.coerce.number().int().positive(),
  techId:           z.string().optional(),
  routeId:          z.coerce.number().int().positive().optional(),
  skimmed:          z.boolean().default(false),
  brushed:          z.boolean().default(false),
  vacuumed:         z.boolean().default(false),
  filterCleaned:    z.boolean().default(false),
  chemicalsAdded:   z.boolean().default(false),
  equipmentChecked: z.boolean().default(false),
  chemicalsUsed:    z.any().optional(),
  issuesFound:      z.string().max(500).optional().nullable(),
  techNotes:        z.string().max(2000).optional().nullable(),
  photos:           z.array(z.string().url()).optional(),
}).merge(ChemReadingSchema);

// ── Invoice schemas ───────────────────────────────────────────────────────────
export const LineItemSchema = z.object({
  desc: z.string().min(1).max(200),
  qty:  z.coerce.number().int().min(1).max(1000),
  rate: z.coerce.number().min(0).max(1000000),
});

export const CreateInvoiceSchema = z.object({
  companyId:   z.coerce.number().int().positive(),
  poolId:      z.coerce.number().int().positive().optional(),
  clientName:  z.string().min(1).max(100),
  clientEmail: z.string().email().optional().or(z.literal("")),
  lineItems:   z.union([z.array(LineItemSchema), z.string()]),
  dueDate:     z.string().optional(),
  notes:       z.string().max(1000).optional(),
});

// ── Auth / company schemas ────────────────────────────────────────────────────
export const CreateCompanySchema = z.object({
  companyName: z.string().min(1, "Company name required").max(100),
  phone:       z.string().max(30).optional(),
  address:     z.string().max(200).optional(),
  ownerId:     z.string().min(1),
  email:       z.string().email(),
  plan:        z.enum(["starter","solo","growth","large"]).default("solo"),
});

// ── Chemistry analysis schema ─────────────────────────────────────────────────
export const ChemAnalysisSchema = z.object({
  freeChlorine:     z.coerce.number().min(0).max(20),
  ph:               z.coerce.number().min(6.0).max(9.0),
  totalAlkalinity:  z.coerce.number().min(0).max(500).optional(),
  calciumHardness:  z.coerce.number().min(0).max(1000).optional(),
  cyanuricAcid:     z.coerce.number().min(0).max(300).optional(),
  waterTemp:        z.coerce.number().min(32).max(120).optional(),
  volumeGallons:    z.coerce.number().min(100).max(10000000).optional(),
  locale:           z.string().optional(),
  unitSystem:       z.enum(["imperial","metric"]).optional(),
});

// ── Mileage schema ────────────────────────────────────────────────────────────
export const CreateMileageSchema = z.object({
  userId:  z.string().min(1),
  routeId: z.coerce.number().int().positive().optional(),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  miles:   z.coerce.number().min(0).max(2000),
  purpose: z.string().max(200).optional(),
});

// ── Referral schema ───────────────────────────────────────────────────────────
export const ReferralSchema = z.object({
  referrerId:  z.string().min(1),
  refereeEmail: z.string().email(),
});

// ── Inventory schema ──────────────────────────────────────────────────────────
export const InventoryItemSchema = z.object({
  companyId:   z.coerce.number().int().positive(),
  name:        z.string().min(1).max(100),
  unit:        z.string().max(20),
  currentQty:  z.coerce.number().min(0),
  minQty:      z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0).optional(),
});

// ── Validation helper ─────────────────────────────────────────────────────────
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  data:   unknown
): { data: z.infer<T>; error: null } | { data: null; error: Response } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return {
      data:  null,
      error: Response.json({ error: `Validation failed: ${messages}` }, { status: 400 }),
    };
  }
  return { data: result.data, error: null };
}
