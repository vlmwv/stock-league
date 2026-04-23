-- 모든 사용자의 '기본 폴더' 일괄 삭제 (공백 등 예외 케이스 포함)
UPDATE public.wishlists 
SET group_id = NULL 
WHERE group_id IN (SELECT id FROM public.wishlist_groups WHERE TRIM(name) = '기본 폴더');

DELETE FROM public.wishlist_groups WHERE TRIM(name) = '기본 폴더';
