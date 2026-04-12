-- 2026-04-12 IR 및 공시 정보 삭제 마이그레이션

-- 1. IR 정보 테이블 삭제
DROP TABLE IF EXISTS ir_info;

-- 2. 뉴스 테이블에서 IR 타입 데이터 삭제
DELETE FROM news WHERE type = 'ir';
