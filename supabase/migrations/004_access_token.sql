-- Access token system for link-based authentication
ALTER TABLE players ADD COLUMN IF NOT EXISTS access_token uuid UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE players ALTER COLUMN phone DROP NOT NULL;
UPDATE players SET access_token = gen_random_uuid() WHERE access_token IS NULL;

-- Secure function to validate token without exposing it in selects
CREATE OR REPLACE FUNCTION public.validate_access_token(token uuid)
RETURNS TABLE(player_id uuid, display_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.display_name
  FROM players p
  WHERE p.access_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
