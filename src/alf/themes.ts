import {createTheme, type Palette} from '@bsky.app/alf'

/**
 * Spike palette — Countach orange on snow (founder's photo, 6 September 2026).
 *
 * Light: ground #FFFFFF (the snow read as a tint over a whole page — founder, 6 Sept),
 *   ink #1E1F21 (the slats), accent #E4602A (the car).
 * Night: ground #000000 (same reason), ink #EDEEF0, the same accent.
 *
 * The accent is the one constant across both modes. As text on the light ground
 * it measures 3.4:1 (below AA's 4.5) and on the night ground 5.6:1; the founder
 * asked for the photo's colour, so it is pinned at primary_500 unchanged rather
 * than darkened to pass. Darken to #B84D23 if AA on light matters.
 *
 * The contrast_* ramp is a neutral grey between ground and ink, monotonic.
 * The negative_* ramp is the previous brand red, so an error never wears the accent.
 * Written out rather than derived with the library's `invertPalette`, which ties
 * the night ground to the day ink.
 */

const STATIC = {
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#FFC404',
}

const LIGHT: Palette = {
  ...STATIC,
  pink: '#E4602A',
  like: '#E4602A',

  contrast_0: '#FFFFFF',
  contrast_25: '#F6F6F6',
  contrast_50: '#EDEDED',
  contrast_100: '#DDDDDE',
  contrast_200: '#C4C5C5',
  contrast_300: '#ACACAD',
  contrast_400: '#939394',
  contrast_500: '#7C7D7E',
  contrast_600: '#68696A',
  contrast_700: '#565758',
  contrast_800: '#464749',
  contrast_900: '#393A3C',
  contrast_950: '#2E2F31',
  contrast_975: '#27282A',
  contrast_1000: '#1E1F21',

  primary_25: '#FDF2EE',
  primary_50: '#FBE7DF',
  primary_100: '#F7D2C3',
  primary_200: '#F3B79F',
  primary_300: '#ED9875',
  primary_400: '#E8794C',
  primary_500: '#E4602A',
  primary_600: '#C45324',
  primary_700: '#A4451E',
  primary_800: '#843818',
  primary_900: '#642A12',
  primary_950: '#491F0D',
  primary_975: '#321509',

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

  negative_25: '#FEF3F3',
  negative_50: '#FDE2E3',
  negative_100: '#FCC0C3',
  negative_200: '#F8969A',
  negative_300: '#F3686F',
  negative_400: '#E8454D',
  negative_500: '#D72932',
  negative_600: '#BD1F27',
  negative_700: '#A1171E',
  negative_800: '#841016',
  negative_900: '#650B10',
  negative_950: '#4A070B',
  negative_975: '#340407',
}

const DARK: Palette = {
  ...STATIC,
  pink: '#E4602A',
  like: '#E4602A',

  contrast_0: '#000000',
  contrast_25: '#090A0A',
  contrast_50: '#131313',
  contrast_100: '#242424',
  contrast_200: '#3E3E3E',
  contrast_300: '#585859',
  contrast_400: '#727273',
  contrast_500: '#898A8B',
  contrast_600: '#9F9FA1',
  contrast_700: '#B2B2B4',
  contrast_800: '#C2C3C5',
  contrast_900: '#D1D1D3',
  contrast_950: '#DCDDDF',
  contrast_975: '#E4E4E6',
  contrast_1000: '#EDEEF0',

  primary_25: '#120803',
  primary_50: '#220E06',
  primary_100: '#401B0C',
  primary_200: '#672B13',
  primary_300: '#943E1B',
  primary_400: '#C05123',
  primary_500: '#E4602A',
  primary_600: '#E87648',
  primary_700: '#EC8D66',
  primary_800: '#EFA383',
  primary_900: '#F3B9A1',
  primary_950: '#F6CCBB',
  primary_975: '#F9DCD0',

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

  negative_25: '#2A0404',
  negative_50: '#3C0706',
  negative_100: '#530A09',
  negative_200: '#71100E',
  negative_300: '#931715',
  negative_400: '#CA1916',
  negative_500: '#F03835',
  negative_600: '#F45552',
  negative_700: '#F87572',
  negative_800: '#FA9B99',
  negative_900: '#FBBCBB',
  negative_950: '#FDD9D8',
  negative_975: '#FEECEC',
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
//   Upgrade: a second night palette lifted a few steps off #000000, same shape.
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
