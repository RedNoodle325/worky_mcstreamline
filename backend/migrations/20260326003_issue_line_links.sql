CREATE TABLE IF NOT EXISTS public.issue_line_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    service_ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_line_links_issue ON public.issue_line_links(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_line_links_ticket ON public.issue_line_links(service_ticket_id);
CREATE INDEX IF NOT EXISTS idx_issue_line_links_order ON public.issue_line_links(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_line_links_unique ON public.issue_line_links(issue_id, order_id);
