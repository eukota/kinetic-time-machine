import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 5
const SWIPE_THRESHOLD = 48

interface TouchPoint {
  x: number
  y: number
}

interface PinchState {
  startDistance: number
  startScale: number
  startX: number
  startY: number
}

interface PanState {
  startX: number
  startY: number
  originX: number
  originY: number
}

interface ZoomableImageProps {
  src: string
  alt: string
  imageClassName?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
}

function touchCenter(a: Touch, b: Touch): TouchPoint {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function ZoomableImage({
  src,
  alt,
  imageClassName = '',
  onSwipeLeft,
  onSwipeRight,
}: ZoomableImageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const scaleRef = useRef(MIN_SCALE)
  const offsetRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef<PinchState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const swipeRef = useRef<{ start: TouchPoint; tracking: boolean } | null>(null)
  const lastTapRef = useRef(0)

  const syncTransform = useCallback((nextScale: number, nextOffset: TouchPoint) => {
    scaleRef.current = nextScale
    offsetRef.current = nextOffset
    setScale(nextScale)
    setOffset(nextOffset)
  }, [])

  const resetTransform = useCallback(() => {
    syncTransform(MIN_SCALE, { x: 0, y: 0 })
  }, [syncTransform])

  useEffect(() => {
    resetTransform()
  }, [src, resetTransform])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const updateSize = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const blockBrowserGesture = (event: TouchEvent) => {
      if (event.touches.length >= 2 || (event.touches.length === 1 && scaleRef.current > MIN_SCALE)) {
        event.preventDefault()
      }
    }

    node.addEventListener('touchmove', blockBrowserGesture, { passive: false })
    return () => node.removeEventListener('touchmove', blockBrowserGesture)
  }, [])

  const clampOffset = useCallback((nextScale: number, nextOffset: TouchPoint): TouchPoint => {
    const node = viewportRef.current
    if (!node || nextScale <= MIN_SCALE) return { x: 0, y: 0 }

    const maxX = ((nextScale - 1) * node.clientWidth) / 2
    const maxY = ((nextScale - 1) * node.clientHeight) / 2
    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    }
  }, [])

  const applyPinch = useCallback((touches: TouchList) => {
    if (touches.length < 2 || !pinchRef.current || !viewportRef.current) return

    const distance = touchDistance(touches[0], touches[1])
    const center = touchCenter(touches[0], touches[1])
    const rect = viewportRef.current.getBoundingClientRect()
    const focalX = center.x - rect.left - rect.width / 2
    const focalY = center.y - rect.top - rect.height / 2

    const { startDistance, startScale, startX, startY } = pinchRef.current
    const nextScale = clamp(startScale * (distance / startDistance), MIN_SCALE, MAX_SCALE)
    const scaleRatio = nextScale / startScale

    const nextOffset = clampOffset(nextScale, {
      x: focalX - (focalX - startX) * scaleRatio,
      y: focalY - (focalY - startY) * scaleRatio,
    })

    syncTransform(nextScale, nextOffset)
  }, [clampOffset, syncTransform])

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      swipeRef.current = null
      panRef.current = null
      pinchRef.current = {
        startDistance: touchDistance(event.touches[0], event.touches[1]),
        startScale: scaleRef.current,
        startX: offsetRef.current.x,
        startY: offsetRef.current.y,
      }
      return
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0]
      if (scaleRef.current > MIN_SCALE) {
        panRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          originX: offsetRef.current.x,
          originY: offsetRef.current.y,
        }
      } else {
        swipeRef.current = {
          start: { x: touch.clientX, y: touch.clientY },
          tracking: true,
        }
      }
    }
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      applyPinch(event.touches)
      return
    }

    if (event.touches.length === 1 && panRef.current) {
      const touch = event.touches[0]
      const { startX, startY, originX, originY } = panRef.current
      const nextOffset = clampOffset(scaleRef.current, {
        x: originX + (touch.clientX - startX),
        y: originY + (touch.clientY - startY),
      })
      syncTransform(scaleRef.current, nextOffset)
      return
    }

    if (event.touches.length === 1 && swipeRef.current?.tracking) {
      const touch = event.touches[0]
      const dx = Math.abs(touch.clientX - swipeRef.current.start.x)
      const dy = Math.abs(touch.clientY - swipeRef.current.start.y)
      if (dy > dx) swipeRef.current.tracking = false
    }
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length >= 2) return

    if (event.touches.length === 1 && pinchRef.current) {
      pinchRef.current = null
      panRef.current = {
        startX: event.touches[0].clientX,
        startY: event.touches[0].clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
      }
      return
    }

    pinchRef.current = null
    panRef.current = null

    if (scaleRef.current <= MIN_SCALE + 0.02) {
      resetTransform()
    }

    if (swipeRef.current?.tracking && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0]
      const dx = touch.clientX - swipeRef.current.start.x
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        if (dx < 0) onSwipeLeft?.()
        else onSwipeRight?.()
      }
    }
    swipeRef.current = null
  }

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (scaleRef.current > MIN_SCALE + 0.05) resetTransform()
      else syncTransform(2.5, { x: 0, y: 0 })
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  const imageStyle =
    viewportSize.width > 0 && viewportSize.height > 0
      ? { maxWidth: viewportSize.width, maxHeight: viewportSize.height }
      : undefined

  return (
    <div
      ref={viewportRef}
      className="kinetic-modal-photo-viewport"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      <div
        className="kinetic-modal-photo-transform"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
        }}
      >
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          style={imageStyle}
          className={`kinetic-modal-photo-image ${imageClassName}`.trim()}
        />
      </div>
    </div>
  )
}
