-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Allow Individual Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Owner Access" ON storage.objects;

-- 1. 모든 사용자가 아바타 이미지를 볼 수 있도록 허용 (기존 유지)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
    END IF;
END $$;

-- 2. 인증된 사용자가 자신의 폴더(auth.uid()) 내의 객체에 대해 모든 권한(INSERT, UPDATE, DELETE)을 갖도록 설정
-- 문자열 매칭(LIKE)을 사용하여 더 확실하게 판별합니다.
CREATE POLICY "Allow Individual Owner Access"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (name LIKE auth.uid()::text || '/%')
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (name LIKE auth.uid()::text || '/%')
);
