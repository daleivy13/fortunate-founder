// SQL to run in Neon:
// CREATE TABLE IF NOT EXISTS homeowner_profiles (
//   id SERIAL PRIMARY KEY,
//   user_uid TEXT NOT NULL UNIQUE,
//   email TEXT,
//   first_name TEXT,
//   last_name TEXT,
//   phone TEXT,
//   address TEXT,
//   zip TEXT,
//   state TEXT,
//   climate_zone TEXT,
//   pool_type TEXT,
//   pool_shape TEXT,
//   pool_volume_gallons INTEGER,
//   pool_age_years INTEGER,
//   has_spa BOOLEAN DEFAULT false,
//   has_heater BOOLEAN DEFAULT false,
//   has_saltwater BOOLEAN DEFAULT false,
//   has_robot BOOLEAN DEFAULT false,
//   has_lights BOOLEAN DEFAULT false,
//   has_waterfalls BOOLEAN DEFAULT false,
//   equipment_notes TEXT,
//   service_frequency TEXT,
//   current_pro TEXT,
//   goals JSONB DEFAULT '[]',
//   onboarding_step INTEGER DEFAULT 0,
//   onboarding_completed BOOLEAN DEFAULT false,
//   created_at TIMESTAMP DEFAULT NOW(),
//   updated_at TIMESTAMP DEFAULT NOW()
// );

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { getClimateZoneFromZip, getClimateZoneFromState } from "@/lib/climate";

const UpsertSchema = z.object({
  firstName:          z.string().optional(),
  lastName:           z.string().optional(),
  email:              z.string().email().optional(),
  phone:              z.string().optional(),
  address:            z.string().optional(),
  zip:                z.string().optional(),
  state:              z.string().optional(),
  poolType:           z.string().optional(),
  poolShape:          z.string().optional(),
  poolVolumeGallons:  z.number().int().positive().optional(),
  poolAgeYears:       z.number().int().min(0).optional(),
  hasSpa:             z.boolean().optional(),
  hasHeater:          z.boolean().optional(),
  hasSaltwater:       z.boolean().optional(),
  hasRobot:           z.boolean().optional(),
  hasLights:          z.boolean().optional(),
  hasWaterfalls:      z.boolean().optional(),
  equipmentNotes:     z.string().optional(),
  serviceFrequency:   z.string().optional(),
  currentPro:         z.string().optional(),
  goals:              z.array(z.string()).optional(),
  onboardingStep:     z.number().int().min(0).optional(),
  onboardingCompleted:z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const res = await db.execute(sql`SELECT * FROM homeowner_profiles WHERE user_uid = ${auth.uid} LIMIT 1`);
    const profile = res.rows[0] ?? null;
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(UpsertSchema, await req.json());
  if (ve) return ve;

  const climateZone = data.zip
    ? getClimateZoneFromZip(data.zip)
    : data.state
    ? getClimateZoneFromState(data.state)
    : null;

  try {
    await db.execute(sql`
      INSERT INTO homeowner_profiles (
        user_uid, email, first_name, last_name, phone, address, zip, state, climate_zone,
        pool_type, pool_shape, pool_volume_gallons, pool_age_years,
        has_spa, has_heater, has_saltwater, has_robot, has_lights, has_waterfalls,
        equipment_notes, service_frequency, current_pro, goals,
        onboarding_step, onboarding_completed, updated_at
      ) VALUES (
        ${auth.uid},
        ${data.email ?? null}, ${data.firstName ?? null}, ${data.lastName ?? null},
        ${data.phone ?? null}, ${data.address ?? null}, ${data.zip ?? null},
        ${data.state ?? null}, ${climateZone ?? null},
        ${data.poolType ?? null}, ${data.poolShape ?? null},
        ${data.poolVolumeGallons ?? null}, ${data.poolAgeYears ?? null},
        ${data.hasSpa ?? false}, ${data.hasHeater ?? false},
        ${data.hasSaltwater ?? false}, ${data.hasRobot ?? false},
        ${data.hasLights ?? false}, ${data.hasWaterfalls ?? false},
        ${data.equipmentNotes ?? null}, ${data.serviceFrequency ?? null},
        ${data.currentPro ?? null},
        ${JSON.stringify(data.goals ?? [])}::jsonb,
        ${data.onboardingStep ?? 0},
        ${data.onboardingCompleted ?? false},
        NOW()
      )
      ON CONFLICT (user_uid) DO UPDATE SET
        email              = COALESCE(EXCLUDED.email, homeowner_profiles.email),
        first_name         = COALESCE(EXCLUDED.first_name, homeowner_profiles.first_name),
        last_name          = COALESCE(EXCLUDED.last_name, homeowner_profiles.last_name),
        phone              = COALESCE(EXCLUDED.phone, homeowner_profiles.phone),
        address            = COALESCE(EXCLUDED.address, homeowner_profiles.address),
        zip                = COALESCE(EXCLUDED.zip, homeowner_profiles.zip),
        state              = COALESCE(EXCLUDED.state, homeowner_profiles.state),
        climate_zone       = COALESCE(EXCLUDED.climate_zone, homeowner_profiles.climate_zone),
        pool_type          = COALESCE(EXCLUDED.pool_type, homeowner_profiles.pool_type),
        pool_shape         = COALESCE(EXCLUDED.pool_shape, homeowner_profiles.pool_shape),
        pool_volume_gallons= COALESCE(EXCLUDED.pool_volume_gallons, homeowner_profiles.pool_volume_gallons),
        pool_age_years     = COALESCE(EXCLUDED.pool_age_years, homeowner_profiles.pool_age_years),
        has_spa            = COALESCE(EXCLUDED.has_spa, homeowner_profiles.has_spa),
        has_heater         = COALESCE(EXCLUDED.has_heater, homeowner_profiles.has_heater),
        has_saltwater      = COALESCE(EXCLUDED.has_saltwater, homeowner_profiles.has_saltwater),
        has_robot          = COALESCE(EXCLUDED.has_robot, homeowner_profiles.has_robot),
        has_lights         = COALESCE(EXCLUDED.has_lights, homeowner_profiles.has_lights),
        has_waterfalls     = COALESCE(EXCLUDED.has_waterfalls, homeowner_profiles.has_waterfalls),
        equipment_notes    = COALESCE(EXCLUDED.equipment_notes, homeowner_profiles.equipment_notes),
        service_frequency  = COALESCE(EXCLUDED.service_frequency, homeowner_profiles.service_frequency),
        current_pro        = COALESCE(EXCLUDED.current_pro, homeowner_profiles.current_pro),
        goals              = COALESCE(EXCLUDED.goals, homeowner_profiles.goals),
        onboarding_step    = GREATEST(EXCLUDED.onboarding_step, homeowner_profiles.onboarding_step),
        onboarding_completed = EXCLUDED.onboarding_completed OR homeowner_profiles.onboarding_completed,
        updated_at         = NOW()
    `);
  } catch {
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, climateZone });
}
