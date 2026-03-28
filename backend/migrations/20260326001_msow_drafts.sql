-- MSOW drafts — one draft per site (or global if no site)
CREATE TABLE IF NOT EXISTS public.msow_drafts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Untitled MSOW',
    form_data   JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msow_drafts_site ON public.msow_drafts(site_id);
