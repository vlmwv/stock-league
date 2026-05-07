-- 1. 예측 성공(predictions) 트리거 함수 수정 (성공률 분모를 전체 참여 수로 환원)
CREATE OR REPLACE FUNCTION public.handle_prediction_win_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_id BIGINT;
    v_win_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- 대상 stock_id 설정
    IF (TG_OP = 'DELETE') THEN
        v_stock_id := OLD.stock_id;
    ELSE
        v_stock_id := NEW.stock_id;
    END IF;

    -- 1. 통계 수치 증감 처리
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.stocks 
        SET 
            prediction_count = COALESCE(prediction_count, 0) + 1,
            win_count = COALESCE(win_count, 0) + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
            lose_count = COALESCE(lose_count, 0) + CASE WHEN NEW.result = 'lose' THEN 1 ELSE 0 END
        WHERE id = v_stock_id;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.stocks 
        SET 
            prediction_count = GREATEST(0, COALESCE(prediction_count, 0) - 1),
            win_count = GREATEST(0, COALESCE(win_count, 0) - CASE WHEN OLD.result = 'win' THEN 1 ELSE 0 END),
            lose_count = GREATEST(0, COALESCE(lose_count, 0) - CASE WHEN OLD.result = 'lose' THEN 1 ELSE 0 END)
        WHERE id = v_stock_id;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- 결과가 win으로 변경/해제된 경우
        IF (COALESCE(OLD.result, 'pending') != 'win' AND NEW.result = 'win') THEN
            UPDATE public.stocks SET win_count = COALESCE(win_count, 0) + 1 WHERE id = v_stock_id;
        ELSIF (OLD.result = 'win' AND COALESCE(NEW.result, 'pending') != 'win') THEN
            UPDATE public.stocks SET win_count = GREATEST(0, COALESCE(win_count, 0) - 1) WHERE id = v_stock_id;
        END IF;

        -- 결과가 lose로 변경/해제된 경우
        IF (COALESCE(OLD.result, 'pending') != 'lose' AND NEW.result = 'lose') THEN
            UPDATE public.stocks SET lose_count = COALESCE(lose_count, 0) + 1 WHERE id = v_stock_id;
        ELSIF (OLD.result = 'lose' AND COALESCE(NEW.result, 'pending') != 'lose') THEN
            UPDATE public.stocks SET lose_count = GREATEST(0, COALESCE(lose_count, 0) - 1) WHERE id = v_stock_id;
        END IF;
    END IF;

    -- 2. 최종 win_rate 재계산 (전체 참여 수 기준)
    SELECT win_count, prediction_count INTO v_win_count, v_total_count
    FROM public.stocks WHERE id = v_stock_id;

    IF v_total_count > 0 THEN
        UPDATE public.stocks 
        SET win_rate = ROUND((v_win_count::NUMERIC / v_total_count::NUMERIC) * 100, 1)
        WHERE id = v_stock_id;
    ELSE
        UPDATE public.stocks SET win_rate = 0 WHERE id = v_stock_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 데이터 기반 성공률 재계산 (전체 참여 수 기준)
UPDATE public.stocks 
SET win_rate = CASE 
    WHEN prediction_count > 0 THEN ROUND((win_count::NUMERIC / prediction_count::NUMERIC) * 100, 1)
    ELSE 0 
END;
