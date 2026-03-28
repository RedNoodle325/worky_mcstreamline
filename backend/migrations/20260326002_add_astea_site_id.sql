ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS astea_site_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sites_astea_site_id ON public.sites(astea_site_id) WHERE astea_site_id IS NOT NULL;
