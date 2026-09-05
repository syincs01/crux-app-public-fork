import {createTheme, type Palette} from '@bsky.app/alf'

/**
 * Spike palette — white-dominant tricolour.
 *
 * Light: ground #E4E4E4, ink #272727, accent #D72932.
 * Night: ground #181818, ink #F5F5F5, accent #F03835 (4.50:1 on the ground).
 *
 * The two palettes are written out rather than derived with the library's
 * `invertPalette`, because inversion ties the night ground to the day ink
 * (they would have to be the same hex) and the four values above are fixed.
 *
 * The contrast_* ramp is a neutral grey between ground and ink, monotonic.
 * The primary_* ramp is hue 357 (day) / hue 1 (night) with the named accent
 * pinned at the 500 step, which is what the semantic atoms read.
 * The negative_* ramp is amber (hue 24) so an error never wears the brand red.
 */

const STATIC = {
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#FFC404',
}

const LIGHT: Palette = {
  ...STATIC,
  pink: '#D72932',
  like: '#D72932',

  contrast_0: '#E4E4E4',
  contrast_25: '#DCDCDC',
  contrast_50: '#D4D4D4',
  contrast_100: '#C6C6C6',
  contrast_200: '#B0B0B0',
  contrast_300: '#9A9A9A',
  contrast_400: '#858585',
  contrast_500: '#6F6F6F',
  contrast_600: '#5E5E5E',
  contrast_700: '#4F4F4F',
  contrast_800: '#434343',
  contrast_900: '#383838',
  contrast_950: '#313131',
  contrast_975: '#2C2C2C',
  contrast_1000: '#272727',

  primary_25: '#FEF3F3',
  primary_50: '#FDE2E3',
  primary_100: '#FCC0C3',
  primary_200: '#F8969A',
  primary_300: '#F3686F',
  primary_400: '#E8454D',
  primary_500: '#D72932',
  primary_600: '#BD1F27',
  primary_700: '#A1171E',
  primary_800: '#841016',
  primary_900: '#650B10',
  primary_950: '#4A070B',
  primary_975: '#340407',

  positive_25: '#ECFEF5',
  positive_50: '#D3FDE8',
  positive_100: '#A3FACF',
  positive_200: '#6AF6B0',
  positive_300: '#2CF28F',
  positive_400: '#0DD370',
  positive_500: '#09B35E',
  positive_600: '#04904A',
  positive_700: '#036D38',
  positive_800: '#04522B',
  positive_900: '#033F21',
  positive_950: '#032A17',
  positive_975: '#021D0F',

  negative_25: '#FEF7F3',
  negative_50: '#FDEDE2',
  negative_100: '#FCD8C0',
  negative_200: '#F8BD96',
  negative_300: '#F3A068',
  negative_400: '#E88645',
  negative_500: '#D76F29',
  negative_600: '#BD5E1F',
  negative_700: '#A14E17',
  negative_800: '#843E10',
  negative_900: '#652F0B',
  negative_950: '#4A2207',
  negative_975: '#341704',
}

const DARK: Palette = {
  ...STATIC,
  pink: '#F03835',
  like: '#F03835',

  contrast_0: '#181818',
  contrast_25: '#1E1E1E',
  contrast_50: '#242424',
  contrast_100: '#2E2E2E',
  contrast_200: '#3D3D3D',
  contrast_300: '#4D4D4D',
  contrast_400: '#5F5F5F',
  contrast_500: '#757575',
  contrast_600: '#8A8A8A',
  contrast_700: '#A0A0A0',
  contrast_800: '#B6B6B6',
  contrast_900: '#CBCBCB',
  contrast_950: '#DEDEDE',
  contrast_975: '#EAEAEA',
  contrast_1000: '#F5F5F5',

  primary_25: '#2A0404',
  primary_50: '#3C0706',
  primary_100: '#530A09',
  primary_200: '#71100E',
  primary_300: '#931715',
  primary_400: '#CA1916',
  primary_500: '#F03835',
  primary_600: '#F45552',
  primary_700: '#F87572',
  primary_800: '#FA9B99',
  primary_900: '#FBBCBB',
  primary_950: '#FDD9D8',
  primary_975: '#FEECEC',

  positive_25: '#021D0F',
  positive_50: '#032A17',
  positive_100: '#033F21',
  positive_200: '#04522B',
  positive_300: '#036D38',
  positive_400: '#04904A',
  positive_500: '#09B35E',
  positive_600: '#0DD370',
  positive_700: '#2CF28F',
  positive_800: '#6AF6B0',
  positive_900: '#A3FACF',
  positive_950: '#D3FDE8',
  positive_975: '#ECFEF5',

  negative_25: '#341704',
  negative_50: '#4A2207',
  negative_100: '#652F0B',
  negative_200: '#843E10',
  negative_300: '#A14E17',
  negative_400: '#BD5E1F',
  negative_500: '#D76F29',
  negative_600: '#E88645',
  negative_700: '#F3A068',
  negative_800: '#F8BD96',
  negative_900: '#FCD8C0',
  negative_950: '#FDEDE2',
  negative_975: '#FEF7F3',
}

const light = createTheme({scheme: 'light', name: 'light', palette: LIGHT})
const dark = createTheme({
  scheme: 'dark',
  name: 'dark',
  palette: DARK,
  options: {shadowOpacity: 0.4},
})
// ponytail: dim is the dark palette verbatim — the spike names one night ground.
//   Ceiling: a user who wants a third, softer night theme gets nothing new.
//   Upgrade: a second night palette lifted a few steps off #181818, same shape.
const dim = createTheme({
  scheme: 'dark',
  name: 'dim',
  palette: DARK,
  options: {shadowOpacity: 0.4},
})

export const themes = {
  lightPalette: light.palette,
  darkPalette: dark.palette,
  dimPalette: dim.palette,
  light,
  dark,
  dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export {dark, dim, light}
