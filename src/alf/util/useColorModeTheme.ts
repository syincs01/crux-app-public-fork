import {useLayoutEffect} from 'react'
import {type ColorSchemeName, useColorScheme} from 'react-native'
import {type ThemeName} from '@bsky.app/alf'

import {useThemePrefs} from '#/state/shell'
import {dark, dim, light} from '#/alf/themes'
import {IS_WEB} from '#/env'

export function useColorModeTheme(): ThemeName {
  const theme = useThemeName()

  useLayoutEffect(() => {
    updateDocument(theme)
  }, [theme])

  return theme
}

export function useThemeName(): ThemeName {
  const colorScheme = useColorScheme()
  const {colorMode, darkTheme} = useThemePrefs()

  return getThemeName(colorScheme, colorMode, darkTheme)
}

function getThemeName(
  _colorScheme: ColorSchemeName | null | undefined,
  colorMode: 'system' | 'light' | 'dark',
  darkTheme?: ThemeName,
) {
  if (
    // ponytail (crux spike): 'system' reads as light — white is the default
    // (founder, 6 September 2026) and every existing browser has 'system' stored.
    //   Ceiling: a person who wants the app to follow the OS gets light until they pick dark.
    //   Upgrade: a one-time migration of stored 'system' to 'light', then follow the OS again.
    colorMode === 'system' ||
    colorMode === 'light'
  ) {
    return 'light'
  } else {
    return darkTheme ?? 'dim'
  }
}

function updateDocument(theme: ThemeName) {
  if (IS_WEB && typeof window !== 'undefined') {
    const html = window.document.documentElement
    const meta = window.document.querySelector('meta[name="theme-color"]')

    // remove any other color mode classes
    html.className = html.className.replace(/(theme)--\w+/g, '')
    html.classList.add(`theme--${theme}`)
    // set color to 'theme-color' meta tag
    meta?.setAttribute('content', getBackgroundColor(theme))
    window.localStorage.setItem('ALF_THEME', theme)
  }
}

export function getBackgroundColor(theme: ThemeName): string {
  switch (theme) {
    case 'light':
      return light.atoms.bg.backgroundColor
    case 'dark':
      return dark.atoms.bg.backgroundColor
    case 'dim':
      return dim.atoms.bg.backgroundColor
  }
}
