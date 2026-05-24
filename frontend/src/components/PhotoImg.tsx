import { useEffect, useState } from 'react'

interface PhotoImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  primarySrc: string
  fallbackSrc: string
  srcSet?: string
}

/** Prefer a responsive variant, but fall back to the original if the variant 404s. */
export const PhotoImg = ({
  primarySrc,
  fallbackSrc,
  srcSet,
  onError,
  ...props
}: PhotoImgProps) => {
  const [src, setSrc] = useState(primarySrc)
  const [activeSrcSet, setActiveSrcSet] = useState(srcSet)

  useEffect(() => {
    setSrc(primarySrc)
    setActiveSrcSet(srcSet)
  }, [primarySrc, srcSet])

  return (
    <img
      {...props}
      src={src}
      srcSet={activeSrcSet}
      onError={(event) => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc)
          setActiveSrcSet(undefined)
        }
        onError?.(event)
      }}
    />
  )
}
