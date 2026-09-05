import Svg, {
  type PathProps,
  type SvgProps,
  Text as SvgText,
} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 17 / 64

export function Logotype({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')
  // @ts-expect-error it's fiiiiine
  const size = parseInt(rest.width || 32)

  return (
    <Svg
      fill="none"
      viewBox="0 0 64 17"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <SvgText
        fill={fill || pal.text.color}
        x="32"
        y="15.7"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fontFamily="InterVariable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif">
        Crux
      </SvgText>
    </Svg>
  )
}
