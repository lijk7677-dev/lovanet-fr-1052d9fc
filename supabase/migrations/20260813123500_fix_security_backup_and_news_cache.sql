-- Security migration: restrict backup table writes and remove public access to news cache

REVOKE SELECT ON public.news_cache FROM anon;
REVOKE SELECT ON public.news_cache FROM authenticated;
DROP POLICY IF EXISTS news_cache_public_read ON public.news_cache;

ALTER TABLE public.imported_videos_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no public insert imported_videos_backup" ON public.imported_videos_backup;
DROP POLICY IF EXISTS "no public update imported_videos_backup" ON public.imported_videos_backup;
DROP POLICY IF EXISTS "no public delete imported_videos_backup" ON public.imported_videos_backup;
CREATE POLICY "no public insert imported_videos_backup" ON public.imported_videos_backup
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no public update imported_videos_backup" ON public.imported_videos_backup
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no public delete imported_videos_backup" ON public.imported_videos_backup
  FOR DELETE TO authenticated USING (false);

ALTER TABLE public.youtube_manga_videos_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no public insert youtube_manga_videos_backup" ON public.youtube_manga_videos_backup;
DROP POLICY IF EXISTS "no public update youtube_manga_videos_backup" ON public.youtube_manga_videos_backup;
DROP POLICY IF EXISTS "no public delete youtube_manga_videos_backup" ON public.youtube_manga_videos_backup;
CREATE POLICY "no public insert youtube_manga_videos_backup" ON public.youtube_manga_videos_backup
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no public update youtube_manga_videos_backup" ON public.youtube_manga_videos_backup
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no public delete youtube_manga_videos_backup" ON public.youtube_manga_videos_backup
  FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.news_cache TO service_role;
GRANT SELECT ON public.imported_videos_backup TO service_role;
GRANT SELECT ON public.youtube_manga_videos_backup TO service_role;
