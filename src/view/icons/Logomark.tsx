import Svg, {
  type PathProps,
  type SvgProps,
  Text as SvgText,
} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 54 / 61

export function Logomark({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')
  // @ts-expect-error it's fiiiiine
  const size = parseInt(rest.width || 32)

  return (
    <Svg
      fill="none"
      viewBox="0 0 61 54"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <SvgText
        fill={fill || pal.text.color}
        x="30.5"
        y="45.3"
        textAnchor="middle"
        fontSize="72"
        fontFamily="Apple Symbols, Segoe UI Symbol, Noto Sans Symbols2, DejaVu Sans, sans-serif">
        {'\u2643'}
      </SvgText>
    </Svg>
  )
}
