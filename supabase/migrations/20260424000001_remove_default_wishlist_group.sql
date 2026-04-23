-- '기본 폴더' 자동 생성 트리거 제거 및 기존 데이터 정리
-- 1. 트리거 제거
DROP TRIGGER IF EXISTS on_profile_created_wishlist_group ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user_wishlist_group();

-- 2. 기존 '기본 폴더' 데이터 정리 (group_id를 NULL로 만들고 폴더 삭제)
-- ON DELETE CASCADE로 인해 위시리스트 항목이 삭제되는 것을 방지하기 위해 먼저 NULL로 업데이트
-- 공백 등이 포함될 경우를 대비해 TRIM 사용
UPDATE public.wishlists 
SET group_id = NULL 
WHERE group_id IN (SELECT id FROM public.wishlist_groups WHERE TRIM(name) = '기본 폴더');

DELETE FROM public.wishlist_groups WHERE TRIM(name) = '기본 폴더';
