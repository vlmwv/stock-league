-- 기존 모든 정책 삭제 (완전 초기화)
DROP POLICY IF EXISTS "Allow Individual Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow Individual Owner Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- 1. 모든 사용자가 아바타 이미지를 볼 수 있도록 허용
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. 로그인한 모든 사용자가 'avatars' 버킷에 자유롭게 업로드/수정/삭제 가능하도록 허용
-- (테스트를 위해 폴더 경로 제한을 일시적으로 해제합니다)
CREATE POLICY "Authenticated Full Access"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'avatars' )
WITH CHECK ( bucket_id = 'avatars' );
