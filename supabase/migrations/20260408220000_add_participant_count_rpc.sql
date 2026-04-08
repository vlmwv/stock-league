-- Create a function to get unique participant count for a given date
-- This function uses SECURITY DEFINER to bypass RLS on the predictions table
CREATE OR REPLACE FUNCTION get_participant_count(p_game_date DATE)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM predictions
    WHERE game_date = p_game_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_participant_count(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_participant_count(DATE) TO anon;
