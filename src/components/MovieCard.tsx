import React from 'react';
import Link from 'next/link';
import { Movie } from '@/types';
import { PosterCover } from './PosterCover';

interface MovieCardProps {
  movie: Movie;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function MovieCard({
  movie,
  href = `/bank/${movie.id}`,
  onClick,
  className = '',
}: MovieCardProps) {
  const content = (
    <article className="group flex flex-col h-full text-left">
      <div className="relative overflow-hidden rounded-lg">
        <PosterCover
          title={movie.title}
          identifier={movie.tmdbId || movie.id}
          done={movie.done}
          year={movie.year}
          className="group-hover:scale-[1.02] transition-transform duration-300"
        />
      </div>

      <div className="pt-2.5 pb-1 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-sans font-medium text-sm sm:text-[15px] leading-snug text-text group-hover:text-accent transition-colors line-clamp-1">
            {movie.title}
          </h3>

          <div className="text-muted text-xs mt-1 flex items-center gap-1.5 flex-wrap">
            {movie.year && <span>{movie.year}</span>}
            {movie.runtime && (
              <>
                <span className="text-muted/40">·</span>
                <span>{movie.runtime}m</span>
              </>
            )}
            {movie.moods && movie.moods.length > 0 && (
              <>
                <span className="text-muted/40">·</span>
                <span className="text-text-subtle/80">{movie.moods[0]}</span>
                {movie.moods.length > 1 && (
                  <span className="text-muted/60 text-[10px]">+{movie.moods.length - 1}</span>
                )}
              </>
            )}
          </div>
        </div>

        {movie.log && (
          <div className="mt-2 pt-1.5 border-t border-line/40 flex items-center justify-between text-[11px] text-muted">
            <span>Rating {movie.log.rating}/10</span>
            <span className="text-accent font-medium">Potensi {movie.log.contentPotential}/10</span>
          </div>
        )}
      </div>
    </article>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block w-full text-left focus-visible:ring-2 focus-visible:ring-accent rounded-lg transition-opacity ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`block w-full text-left focus-visible:ring-2 focus-visible:ring-accent rounded-lg transition-opacity ${className}`}
    >
      {content}
    </Link>
  );
}
