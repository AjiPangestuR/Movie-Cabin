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
    <>
      <PosterCover
        title={movie.title}
        identifier={movie.tmdbId || movie.id}
        done={movie.done}
      />
      <div className="font-bold mt-2 leading-[1.3] text-text line-clamp-1">
        {movie.title}
      </div>
      <div className="text-muted text-[13px] mt-0.5 truncate">
        {movie.year}
        {movie.moods && movie.moods.length > 0 ? `, ${movie.moods[0]}` : ''}
        {movie.moods && movie.moods.length > 1 ? ` +${movie.moods.length - 1}` : ''}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block w-full text-left transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent rounded-[10px] ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`block w-full text-left transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent rounded-[10px] ${className}`}
    >
      {content}
    </Link>
  );
}
