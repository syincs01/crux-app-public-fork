import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type Ending, type GameView, useGame} from '#/lib/crux'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useSession} from '#/state/session'
import {RoomBody, useReplySend} from '#/screens/Crux/Dialogue'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

/**
 * How a game ended, said in English (R6.4: never the record's word for it).
 * The room and the desk both say it, so it is said in one place (R3.3).
 */
export function EndingInWords({ending: e}: {ending: Ending}) {
  return e.kind === 'offered' ? (
    <Trans>@{e.by} offered to close</Trans>
  ) : e.kind === 'agreed' ? (
    <Trans>Agreed — a block was made</Trans>
  ) : e.kind === 'parted' ? (
    <Trans>You parted here</Trans>
  ) : e.kind === 'unfinished' ? (
    <Trans>
      Left unfinished by @{e.by} on {new Date(e.at).toLocaleDateString()}
    </Trans>
  ) : (
    <Trans>Open</Trans>
  )
}

/**
 * A game (the game page §3): the same room a dialogue is played in, read over
 * `/game`. The moves are the messages, and the composer is the one enforcer —
 * nothing here makes a move on a player's behalf. Above the composer, the one
 * line a player needs in order to know whether they are the one to speak; and
 * before they have spoken here at all, that the game is public (§2.8).
 */
export function GameScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'Game'>) {
  const {currentAccount} = useSession()
  const uri = decodeURIComponent(route.params.uri)
  const game = useGame(uri, currentAccount?.handle)
  const {send, loading} = useReplySend(game.data?.lastUri, [
    'crux-game',
    uri,
    currentAccount?.handle ?? '',
  ])
  const myHandle = currentAccount?.handle
  const spokenHere =
    !!myHandle && !!game.data?.messages.some(m => m.speaker === myHandle)
  return (
    <RoomBody
      testID="cruxGameScreen"
      titleText={<Trans>Game</Trans>}
      room={game}
      send={send}
      sendLoading={loading}
      viewerDid={currentAccount?.did}
      extraAboveComposer={
        game.data ? (
          <WhoseMove
            game={game.data.game}
            me={myHandle}
            spokenHere={spokenHere}
          />
        ) : null
      }
    />
  )
}

function WhoseMove({
  game,
  me,
  spokenHere,
}: {
  game: GameView['game']
  me: string | undefined
  spokenHere: boolean
}) {
  const t = useTheme()
  return (
    <Text
      testID="cruxGameLine"
      style={[
        a.px_lg,
        a.py_sm,
        a.text_sm,
        a.leading_snug,
        t.atoms.text_contrast_medium,
      ]}>
      {game.ending.kind !== 'open' ? (
        <EndingInWords ending={game.ending} />
      ) : !spokenHere ? (
        game.publicNotice
      ) : game.toMove === me ? (
        <Trans>Your move</Trans>
      ) : (
        <Trans>Waiting on @{game.toMove}</Trans>
      )}
    </Text>
  )
}
