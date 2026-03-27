-- Migration: create job_schedule and job_schedule_techs tables
CREATE TABLE IF NOT EXISTS public.job_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  pm_id UUID,
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Warranty',
  contract_number TEXT,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','complete','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_schedule_techs (
  job_id UUID NOT NULL REFERENCES public.job_schedule(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, technician_id)
);
