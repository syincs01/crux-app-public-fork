import {useState} from 'react'
import {View} from 'react-native'
import {RichText as RichTextAPI} from '@bsky/sdk/richtext'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {type Games, useGames} from '#/lib/crux'
import {type NavigationProp} from '#/lib/routes/types'
import {writeThreadgateRecord} from '#/state/queries/threadgate'
import {useAppviewClient, usePdsClient, useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {type app, com} from '#/lexicons'

/**
 * Games (the game page §2). Two lists: the invitations made to you, which are
 * requests and are shown to nobody else, and the games you are in. Accepting
 * is the first move — it posts the acceptance and gates the thread to the two
 * players, so a game is a public exchange between two people rather than a
 * thread anyone may crowd.
 */
export function GamesScreen() {
  const {currentAccount} = useSession()
  const games = useGames(currentAccount?.handle)

  return (
    <Layout.Screen testID="cruxGamesScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Games</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_xl]}>
          {games.error ? (
            <Text style={[a.text_sm]}>
              <Trans>Crux is not answering:</Trans>{' '}
              {String(games.error.message)}
            </Text>
          ) : (
            <>
              <Section titleText={<Trans>Invitations to you</Trans>}>
                {games.data && games.data.invites.length === 0 ? (
                  <QuietText>
                    <Trans>
                      Nobody has asked you for a game. An invitation comes from
                      a post of yours.
                    </Trans>
                  </QuietText>
                ) : (
                  games.data?.invites.map(i => (
                    <Invitation key={i.uri} invite={i} />
                  ))
                )}
              </Section>
              <Section titleText={<Trans>Your games</Trans>}>
                {games.data && games.data.games.length === 0 ? (
                  <QuietText>
                    <Trans>No games yet.</Trans>
                  </QuietText>
                ) : (
                  games.data?.games.map(g => <GameRow key={g.root} game={g} />)
                )}
              </Section>
            </>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function Section({
  titleText,
  children,
}: {
  titleText: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={[a.gap_md]}>
      <Text style={[a.text_lg, a.font_bold]}>{titleText}</Text>
      {children}
    </View>
  )
}

function QuietText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
      {children}
    </Text>
  )
}

function Invitation({invite}: {invite: Games['invites'][number]}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const pdsClient = usePdsClient()
  const appviewClient = useAppviewClient()
  const {currentAccount} = useSession()
  const qc = useQueryClient()
  const [accepting, setAccepting] = useState(false)

  const accept = async () => {
    if (!currentAccount || accepting) return
    setAccepting(true)
    let postUri: string | undefined
    let gated: string | undefined
    try {
      // The acceptance names the challenger, so the threadgate's mention rule
      // lets exactly the two of them speak here.
      const rt = new RichTextAPI({text: `@${invite.from} accepted`})
      await rt.detectFacets(appviewClient)
      // A gate that mentions nobody would shut the challenger out of their own
      // game, so an unresolved handle stops the acceptance before it is made.
      if (
        !rt.facets?.some(f =>
          f.features.some(x => x.$type === 'app.bsky.richtext.facet#mention'),
        )
      ) {
        throw new Error(l`Could not reach @${invite.from} — try again`)
      }
      const post = await pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text: rt.text,
          facets: rt.facets,
          createdAt: new Date().toISOString(),
          crux: {game: {invite: invite.uri}},
        },
      })
      postUri = post.uri
      await writeThreadgateRecord({
        pdsClient,
        postUri: post.uri,
        threadgate: {
          $type: 'app.bsky.feed.threadgate',
          post: post.uri,
          allow: [{$type: 'app.bsky.feed.threadgate#mentionRule'}],
          createdAt: new Date().toISOString(),
          hiddenReplies: [],
        } as app.bsky.feed.threadgate.Main,
      })
      gated = post.uri
    } catch (e) {
      // An open thread is not a game: if the gate did not take, the acceptance
      // does not stand either.
      if (postUri) {
        await pdsClient
          .call(com.atproto.repo.deleteRecord, {
            repo: currentAccount.did,
            collection: 'app.bsky.feed.post',
            rkey: postUri.split('/').pop()!,
          })
          .catch(() => {})
      }
      Toast.show((e as Error).message, {type: 'error'})
    } finally {
      setAccepting(false)
    }
    if (gated) {
      void qc.invalidateQueries({queryKey: ['crux-games']})
      navigation.navigate('Game', {uri: encodeURIComponent(gated)})
    }
  }

  return (
    <View
      testID="cruxInvitation"
      style={[
        a.rounded_md,
        a.border,
        a.p_lg,
        a.gap_sm,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.text_md, a.font_bold]}>
        <Trans>@{invite.from} asks you for a game</Trans>
      </Text>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_high]}>
        {invite.subject.text}
      </Text>
      <Text style={[a.text_sm, a.leading_snug]}>
        {invite.stake.kind === 'contrary' ? (
          <Trans>They hold the opposite: “{invite.stake.text}”</Trans>
        ) : invite.stake.kind === 'condition' ? (
          <Trans>It would take: “{invite.stake.text}”</Trans>
        ) : (
          <Trans>They ask: “{invite.stake.text}”</Trans>
        )}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        {invite.clockDays === 1 ? (
          <Trans>1 day to answer</Trans>
        ) : (
          <Trans>{invite.clockDays} days to answer</Trans>
        )}
      </Text>
      <View style={[a.flex_row, a.pt_xs]}>
        <Button
          testID="cruxAcceptInviteBtn"
          label={l`Accept`}
          size="small"
          color="primary"
          variant="solid"
          disabled={accepting}
          onPress={() => void accept()}>
          <ButtonText>
            <Trans>Accept</Trans>
          </ButtonText>
          {accepting ? <ButtonIcon icon={Loader} /> : null}
        </Button>
      </View>
    </View>
  )
}

function GameRow({game}: {game: Games['games'][number]}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  // The ending said in English, never the record's word for it (R6.4).
  const e = game.ending
  const ending =
    e.kind === 'offered'
      ? l`@${e.by} offered to close`
      : e.kind === 'agreed'
        ? l`agreed — a block was made`
        : e.kind === 'parted'
          ? l`you parted here`
          : e.kind === 'unfinished'
            ? l`left unfinished by @${e.by} on ${new Date(e.at).toLocaleDateString()}`
            : l`open`
  return (
    <Button
      testID="cruxGameRow"
      label={game.question}
      onPress={() =>
        navigation.navigate('Game', {uri: encodeURIComponent(game.root)})
      }
      style={[a.w_full]}>
      <View
        style={[
          a.w_full,
          a.gap_2xs,
          a.py_md,
          a.border_b,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_md, a.font_bold, a.leading_snug, a.text_left]}>
          {game.question}
        </Text>
        <Text style={[a.text_sm, a.text_left, t.atoms.text_contrast_medium]}>
          <Trans>with @{game.with}</Trans> · {ending}
        </Text>
      </View>
    </Button>
  )
}
