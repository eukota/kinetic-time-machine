import { useState, useCallback } from 'react'
import { Submission, Team } from '../store'

interface Props {
  submission: Submission
  team: Team | undefined
  index: number
  onClick: () => void
}

export const GalleryTile = ({ submission, team, index, onClick }: Props) => {
  const [overlayVisible, setOverlayVisible] = useState(false)

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      if (!overlayVisible) {
        setOverlayVisible(true)
      } else {
        setOverlayVisible(false)
        onClick()
      }
    },
    [overlayVisible, onClick]
  )

  const timeStr = submission.timestamp
    ? new Date(submission.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : submission.created_at
    ? new Date(submission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div
      data-component="gallery-tile"
      data-component-version="1.0"
      data-component-category="content"
      data-entity-type="content"
      data-entity-id={`sub_${submission.id}`}
      data-component-context={`list:gallery|position:${index}`}
      data-cta-action="open-photo"
      data-cta-label={team?.name ?? 'Race photo'}
      className="kinetic-gallery-tile group bg-kinetic-navy"
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
    >
      {submission.first_photo && (
        <img
          src={`/photos/${submission.first_photo_thumb ?? submission.first_photo}`}
          srcSet={
            submission.first_photo_thumb
              ? [
                  `/photos/${submission.first_photo_thumb} 400w`,
                  submission.first_photo_medium ? `/photos/${submission.first_photo_medium} 900w` : null,
                ]
                  .filter(Boolean)
                  .join(', ')
              : undefined
          }
          sizes="(max-width: 640px) calc(50vw - 8px), (max-width: 1024px) calc(33vw - 8px), calc(25vw - 8px)"
          alt="submission"
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      )}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-kinetic-navy via-kinetic-navy/60 to-transparent
          px-2 pb-2 pt-6 transition-opacity duration-150
          ${overlayVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {team && (
          <p className="text-kinetic-gold text-xs font-bold truncate leading-tight">{team.name}</p>
        )}
        {timeStr && (
          <p className="text-white/70 text-xs leading-tight">{timeStr}</p>
        )}
      </div>
    </div>
  )
}
