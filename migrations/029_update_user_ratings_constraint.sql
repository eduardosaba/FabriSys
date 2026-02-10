-- Atualiza a constraint da tabela user_ratings para permitir avaliações de 1 a 10
ALTER TABLE user_ratings
DROP CONSTRAINT IF EXISTS user_ratings_rating_check;

ALTER TABLE user_ratings
ADD CONSTRAINT user_ratings_rating_check
CHECK (rating >= 1 AND rating <= 5);