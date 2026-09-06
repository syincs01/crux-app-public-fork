import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useGame} from '#/lib/crux'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useSession} from '#/state/session'
import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * ponytail: the game is its room and its desk; this shows only the question
 *   the two of them accepted, so the accepted invitation lands somewhere.
 *   Ceiling: a player cannot move here — there is no room and no desk.
 *   Upgrade: RoomBody over /game and the desk in the right bar (the game
 *     page §3–7, foundations §11).
 */
export function GameScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'Game'>) {
  const {currentAccount} = useSession()
  const uri = decodeURIComponent(route.params.uri)
  const game = useGame(uri, currentAccount?.handle)
  return (
    <Layout.Screen testID="cruxGameScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Game</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_md]}>
          <Text style={[a.text_lg, a.font_bold, a.leading_snug]}>
            {game.data?.question ?? uri}
          </Text>
          {game.error ? (
            <Text style={[a.text_sm]}>
              <Trans>Crux is not answering:</Trans> {String(game.error.message)}
            </Text>
          ) : null}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
