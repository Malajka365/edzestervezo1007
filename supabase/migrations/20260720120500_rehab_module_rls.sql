-- supabase/migrations/20260720120500_rehab_module_rls.sql

DROP POLICY IF EXISTS "Users can view anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can create anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can update anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can delete anamnesis for their teams" ON public.player_anamnesis;

CREATE POLICY "view player_anamnesis by module permission" ON public.player_anamnesis
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_anamnesis by module permission" ON public.player_anamnesis
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_anamnesis by module permission" ON public.player_anamnesis
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_anamnesis by module permission" ON public.player_anamnesis
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

DROP POLICY IF EXISTS "Users can view documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can upload documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can update documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can delete documents for their teams" ON public.player_documents;

CREATE POLICY "view player_documents by module permission" ON public.player_documents
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_documents by module permission" ON public.player_documents
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_documents by module permission" ON public.player_documents
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_documents by module permission" ON public.player_documents
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

DROP POLICY IF EXISTS "Users can view attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can create attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can update attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can delete attendance for their teams" ON public.player_attendance;

CREATE POLICY "view player_attendance by module permission" ON public.player_attendance
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_attendance by module permission" ON public.player_attendance
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_attendance by module permission" ON public.player_attendance
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_attendance by module permission" ON public.player_attendance
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

-- storage.objects policy a player-documents bucket-hez: a filePath
-- '<team_id>/<player_id>/<fájlnév>' formátumú (ld. src/components/DocumentUpload.jsx),
-- az első path-szegmens a team_id.
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded documents" ON storage.objects;

CREATE POLICY "view player-documents by module permission" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'view')
  );
CREATE POLICY "insert player-documents by module permission" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'edit')
  );
CREATE POLICY "delete player-documents by module permission" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'edit')
  );
