-- 1. 'avatars' 버킷 생성 (이미 존재하지 않는 경우)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 모든 사용자가 아바타 이미지를 볼 수 있도록 허용
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3. 인증된 사용자가 자신의 폴더(auth.uid())에 이미지를 업로드할 수 있도록 허용
CREATE POLICY "Allow Individual Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. 인증된 사용자가 자신의 폴더(auth.uid())에 있는 이미지를 수정할 수 있도록 허용
CREATE POLICY "Allow Individual Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. 인증된 사용자가 자신의 폴더(auth.uid())에 있는 이미지를 삭제할 수 있도록 허용
CREATE POLICY "Allow Individual Deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
