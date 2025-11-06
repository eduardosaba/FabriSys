'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Widget } from '../dashboard/Widget';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { WidgetConfig } from '@/lib/types/dashboard';

interface RatingWidgetProps {
  config?: WidgetConfig;
}

interface RatingData {
  id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export default function RatingWidget({ config }: RatingWidgetProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState<RatingData | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      // Carregar avaliação do usuário atual
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: userRatingData } = await supabase
          .from('user_ratings')
          .select('*')
          .eq('user_id', user.user.id)
          .single();

        if (userRatingData) {
          setUserRating(userRatingData);
          setRating(userRatingData.rating);
          setComment(userRatingData.comment || '');
        }
      }

      // Carregar estatísticas gerais
      const { data: allRatings } = await supabase.from('user_ratings').select('rating');

      if (allRatings && allRatings.length > 0) {
        const total = allRatings.reduce((sum, r) => sum + r.rating, 0);
        setAverageRating(total / allRatings.length);
        setTotalRatings(allRatings.length);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma avaliação de 1 a 10 estrelas.',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const ratingData = {
        user_id: user.user.id,
        rating,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (userRating) {
        // Atualizar avaliação existente
        const { error } = await supabase
          .from('user_ratings')
          .update(ratingData)
          .eq('id', userRating.id);

        if (error) throw error;
      } else {
        // Criar nova avaliação
        const { error } = await supabase.from('user_ratings').insert({
          ...ratingData,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      toast({
        title: 'Avaliação enviada',
        description: 'Obrigado pela sua avaliação!',
        variant: 'success',
      });

      await loadRatings(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar sua avaliação.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (interactive: boolean = false) => {
    return Array.from({ length: 10 }, (_, index) => {
      const starNumber = index + 1;
      const isActive = interactive ? (hoverRating || rating) >= starNumber : rating >= starNumber;

      return (
        <button
          key={index}
          type="button"
          disabled={!interactive || loading}
          onClick={() => interactive && setRating(starNumber)}
          onMouseEnter={() => interactive && setHoverRating(starNumber)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`transition-colors ${
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <Star
            className={`w-4 h-4 ${
              isActive ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      );
    });
  };

  return (
    <Widget
      title="Avaliação do Sistema (1-10 estrelas)"
      className="flex flex-col gap-4"
      size={config?.size}
      theme={config?.theme}
    >
      {/* Estatísticas Gerais */}
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={`w-5 h-5 ${
                  averageRating >= index + 1
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Baseado em {totalRatings} avaliação{totalRatings !== 1 ? 'ões' : ''} (escala 1-10)
        </p>
      </div>

      {/* Avaliação do Usuário */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sua Avaliação (1-10 estrelas)
          </label>
          <div className="flex gap-1 justify-center">{renderStars(true)}</div>
          {rating > 0 && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              {rating} estrela{rating !== 1 ? 's' : ''} de 10
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Comentário (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte-nos o que achou do sistema..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            rows={3}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleRatingSubmit}
          disabled={loading || rating === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:cursor-not-allowed"
        >
          {loading
            ? 'Enviando...'
            : userRating
              ? 'Atualizar Avaliação (1-10)'
              : 'Enviar Avaliação (1-10)'}
        </button>
      </div>
    </Widget>
  );
}
