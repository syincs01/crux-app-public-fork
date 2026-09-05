import Svg, {
  type PathProps,
  type SvgProps,
  Text as SvgText,
} from 'react-native-svg'

import {useTheme} from '#/alf'

const ratio = 17 / 64

export function LogomarkWithType({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const t = useTheme()
  const size = parseInt(`${rest.width || 32}`)

  return (
    <Svg
      fill="none"
      viewBox="0 0 136 31"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <SvgText
        x="4"
        y="27"
        fontSize="40"
        fontFamily="Apple Symbols, Segoe UI Symbol, Noto Sans Symbols2, DejaVu Sans, sans-serif"
        fill={fill || t.atoms.text.color}>
        {'\u2643'}
      </SvgText>
      <SvgText
        x="45"
        y="27"
        fontSize="34"
        fontWeight="700"
        fontFamily="InterVariable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
        fill={fill || t.atoms.text.color}>
        Crux
      </SvgText>
    </Svg>
  )
}
