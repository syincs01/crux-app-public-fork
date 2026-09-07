import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQueryClient} from '@tanstack/react-query'

import {
  GAME_MOVE_COLLECTION,
  type GameClaim,
  type GameMoveKind,
  type GameView,
  type Owed,
  useGame,
  useNearChunk,
} from '#/lib/crux'
import {useAgreeMutation} from '#/state/queries/crux-agree'
import {usePostQuery} from '#/state/queries/post'
import {usePdsClient, useSession} from '#/state/session'
import {useReplySend} from '#/screens/Crux/Dialogue'
import {EndingInWords} from '#/screens/Crux/Game'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {com} from '#/lexicons'

/**
 * The player's desk (foundations §11): beside the room, the instruments a
 * player needs in order to make one good move, and never the moves themselves
 * — a move is a message, and the composer is its one enforcer.
 *
 * What it holds, in the order §11 puts them: the two stakes, pinned, so
 * neither player forgets which game the other is playing; where we are, as
 * what is owed rather than as a status; what each has said, with an assertion
 * and a concession told apart (§11.2's straw-man trap); the block so far, with
 * the other's claims this viewer could hold and what holding one would take
 * back of their own (Krabbe's internal stability adjustment); and the ways the
 * game can end. Never a count of persons, never a score, never a comparison of
 * the two players (§11.8).
 *
 * A spectator sees the first four and can act on none of them (§11.9).
 *
 * ponytail: §11's "what changed" is not built — a player cannot see what their
 *   last move changed.
 *   Ceiling: a player returning after a week reads the whole room to find it.
 *   Upgrade: stage 6's `moved` per game, as the feeds already receive it.
 * ponytail: the take-back of one's own claim (§11.4) is not offered here.
 *   Ceiling: a player who wants to retract says so in words and hopes the
 *     record reads it as a withdrawal.
 *   Upgrade: a take-back move with the same falls-preview the Hold rows carry.
 */
export function CruxGameDesk({uri: param}: {uri?: string | undefined}) {
  const t = useTheme()
  const {currentAccount} = useSession()
  // The game's root uri comes from the route, as the screen's does: read from
  // the address once at mount, the desk stayed blank for anyone who reached
  // the game by clicking inside the app (7 September 2026).
  const uri = param ? decodeURIComponent(param) : ''
  const game = useGame(uri, currentAccount?.handle)
  const g = game.data?.game
  const me = currentAccount?.handle
  const iPlay =
    !!me &&
    !!g &&
    (g.players.defender.handle === me || g.players.challenger.handle === me)

  if (!g) return null
  return (
    <View
      testID="cruxGameDesk"
      style={[
        a.gap_md,
        a.p_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        // ponytail: the desk scrolls inside itself, because the right column is
        //   a fixed 100vh box and the desk is the first thing put in it that is
        //   taller than one screen.
        //   Ceiling: two scrollbars side by side on a short window.
        //   Upgrade: the column itself scrolls, which is a change to the
        //     platform's own shell layout.
        web({maxHeight: 'calc(100vh - 130px)', overflowY: 'auto'}),
      ]}>
      <Stakes game={g} />
      <WhereWeAre game={g} me={me} rootUri={uri} lastUri={game.data?.lastUri} />
      <WhatEachHasSaid
        game={g}
        me={iPlay ? me : undefined}
        rootUri={uri}
        lastUri={game.data?.lastUri}
      />
      <TheBlock game={g} iPlay={iPlay} />
      {iPlay ? (
        <CloseAndLeave
          game={g}
          me={me ?? ''}
          rootUri={uri}
          updatedAt={game.dataUpdatedAt}
        />
      ) : null}
    </View>
  )
}

function HeadingText({children}: {children: React.ReactNode}) {
  return <Text style={[a.text_md, a.font_bold]}>{children}</Text>
}

function QuietText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
      {children}
    </Text>
  )
}

function LineText({children}: {children: React.ReactNode}) {
  return <Text style={[a.text_sm, a.leading_snug]}>{children}</Text>
}

/** §11.1: both stakes, immutable, at the top, where they never scroll away. */
function Stakes({game: g}: {game: GameView['game']}) {
  const s = g.players.challenger.stake
  return (
    <View style={[a.gap_2xs]}>
      <HeadingText>
        <Trans>Stakes</Trans>
      </HeadingText>
      <LineText>
        <Trans>@{g.players.defender.handle} holds:</Trans> {g.claim}
      </LineText>
      {s ? (
        <LineText>
          <Trans>@{g.players.challenger.handle}:</Trans>{' '}
          {s.kind === 'contrary' ? (
            <Trans>holds the opposite: “{s.text}”</Trans>
          ) : s.kind === 'condition' ? (
            <Trans>would be moved by: “{s.text}”</Trans>
          ) : (
            <Trans>asks: “{s.text}”</Trans>
          )}
        </LineText>
      ) : null}
    </View>
  )
}

/** §11.1: what is owed, phrased as an obligation and not as a status. */
function WhereWeAre({
  game: g,
  me,
  rootUri,
  lastUri,
}: {
  game: GameView['game']
  me?: string
  rootUri: string
  lastUri: string | undefined
}) {
  return (
    <View style={[a.gap_2xs]}>
      <HeadingText>
        <Trans>Where we are</Trans>
      </HeadingText>
      {g.ending.kind !== 'open' ? (
        <LineText>
          <EndingInWords ending={g.ending} />
        </LineText>
      ) : (
        <>
          {g.owed.map(o => (
            <View key={`${o.by}:${o.claimId}`} style={[a.gap_2xs]}>
              <LineText>
                <Trans>@{o.by} owes an answer:</Trans> “{o.claim}” — {o.what},{' '}
                <DaysAgo since={o.since} />
              </LineText>
              {o.defaulted ? (
                <QuietText>
                  <Trans>
                    not answered within the {g.clockDays} days declared — on the
                    record as a default
                  </Trans>
                </QuietText>
              ) : null}
              {o.by === me
                ? o.restOn.map(r => <RestOnRow key={r.id} reason={r} />)
                : null}
              {o.by === me && o.what === 'asked what it rests on' ? (
                <ChunkOffer
                  owed={o}
                  me={me}
                  rootUri={rootUri}
                  lastUri={lastUri}
                />
              ) : null}
            </View>
          ))}
          <LineText>
            {g.toMove === me ? (
              <Trans>Your move</Trans>
            ) : (
              <Trans>@{g.toMove} to move</Trans>
            )}
          </LineText>
        </>
      )}
    </View>
  )
}

function DaysAgo({since}: {since: string}) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(since)) / 86_400_000),
  )
  return days === 0 ? (
    <Trans>today</Trans>
  ) : days === 1 ? (
    <Trans>1 day ago</Trans>
  ) : (
    <Trans>{days} days ago</Trans>
  )
}

/**
 * §11.2: Brandom's two stores, with Krabbe's distinction visible — what each
 * player asserted against what they merely let stand. The two must look
 * different at a glance or a player is held to a burden they never took on.
 */
function WhatEachHasSaid({
  game: g,
  me,
  rootUri,
  lastUri,
}: {
  game: GameView['game']
  /** The viewer, where they play; a spectator asks nothing (§11.9). */
  me: string | undefined
  rootUri: string
  lastUri: string | undefined
}) {
  return (
    <View style={[a.gap_sm]}>
      <HeadingText>
        <Trans>What each has said</Trans>
      </HeadingText>
      {[g.players.defender.handle, g.players.challenger.handle].map(h => {
        const store = g.stores[h]
        return (
          <View key={h} style={[a.gap_2xs]}>
            <Text style={[a.text_sm, a.font_bold]}>@{h}</Text>
            {store?.asserted
              .filter(c => !c.stepFor)
              .map(c => (
                <Asserted
                  key={c.id}
                  claim={c}
                  steps={store.asserted.filter(s => s.stepFor === c.id)}
                  ask={
                    me && h !== me && g.ending.kind === 'open'
                      ? {rootUri, lastUri}
                      : undefined
                  }
                />
              ))}
            {store?.letStand.map(c => (
              <LetStand key={c.id} claim={c} />
            ))}
            {!store?.asserted.length && !store?.letStand.length ? (
              <QuietText>
                <Trans>Nothing yet.</Trans>
              </QuietText>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

/** The standing register as a dot, always beside its word — never colour alone. */
function StandingDot({tone}: {tone: GameClaim['tone']}) {
  const t = useTheme()
  const colour =
    tone === 'holds'
      ? t.palette.positive_500
      : tone === 'fallen'
        ? t.palette.negative_500
        : tone === 'open'
          ? t.palette.primary_500
          : t.palette.contrast_300
  return (
    <View
      style={[
        a.mt_xs,
        {width: 6, height: 6, borderRadius: 3, backgroundColor: colour},
      ]}
    />
  )
}

function Asserted({
  claim,
  steps = [],
  ask,
}: {
  claim: GameClaim
  /** The inference steps of this claim ("X, because Y" as a causal claim): the step is a claim, shown as the step (the game §3). */
  steps?: GameClaim[]
  /** Where the viewer may ask what THIS claim rests on (the game §3: a move at one claim). */
  ask?: {rootUri: string; lastUri: string | undefined}
}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.gap_xs]}>
      <StandingDot tone={claim.tone} />
      <View style={[a.flex_1]}>
        <Text style={[a.text_sm, a.leading_snug]}>{claim.text}</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {claim.word}
        </Text>
        {ask ? <AskWhatItRestsOn claim={claim} {...ask} /> : null}
        {steps.map(s => (
          <View key={s.id} testID="cruxGameStep" style={[a.pl_md, a.pt_2xs]}>
            <Text
              style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>the step:</Trans> {s.text} — {s.word}
            </Text>
            {ask ? <AskWhatItRestsOn claim={s} {...ask} /> : null}
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * "Ask what it rests on" at one claim (the game §3: ask carries no burden; §4:
 * only at what the other asserted). A post is several claims and a reply at
 * the post is read at its first, so the desk is where a player names WHICH —
 * the platform's `--about`. The words are the player's; the record reads them
 * with the move declared. Found live 7 September 2026: "what does that price
 * comparison rest on?" landed on the reasoned head claim, which held.
 */
function AskWhatItRestsOn({
  claim,
  rootUri,
  lastUri,
}: {
  claim: GameClaim
  rootUri: string
  lastUri: string | undefined
}) {
  const {_} = useLingui()
  const control = Dialog.useDialogControl()
  return (
    <>
      <View style={[a.flex_row, a.pt_2xs]}>
        <Button
          testID="cruxGameAsk"
          label={_(msg`Ask what it rests on`)}
          size="tiny"
          variant="outline"
          color="secondary"
          onPress={() => control.open()}>
          <ButtonText>
            <Trans>Ask what it rests on</Trans>
          </ButtonText>
        </Button>
      </View>
      <Dialog.Outer control={control}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`Ask what it rests on`)}>
          <AskInner
            claim={claim}
            control={control}
            rootUri={rootUri}
            lastUri={lastUri}
          />
          <Dialog.Close />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </>
  )
}

function AskInner({
  claim,
  control,
  rootUri,
  lastUri,
}: {
  claim: GameClaim
  control: Dialog.DialogControlProps
  rootUri: string
  lastUri: string | undefined
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {send, loading} = useReplySend(lastUri, [
    'crux-game',
    rootUri,
    currentAccount?.handle ?? '',
  ])
  const [text, setText] = useState(_(msg`What does this rest on?`))
  const [busy, setBusy] = useState(false)
  const ask = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await send(text.trim(), {
        about: claim.id,
        move: 'asking what it rests on',
      })
      control.close()
    } catch (e) {
      Toast.show(_(msg`Could not ask: ${String(e)}`), {type: 'error'})
    } finally {
      setBusy(false)
    }
  }
  return (
    <View style={[a.gap_md]}>
      <Text style={[a.text_md, a.font_bold]}>
        <Trans>Ask what this rests on</Trans>
      </Text>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        {claim.text}
      </Text>
      <View style={[a.gap_xs]}>
        <TextField.LabelText nativeID="crux-ask-label">
          <Trans>Your words</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <Dialog.Input
            testID="cruxGameAskInput"
            value={text}
            onChangeText={setText}
            label={_(msg`Your words`)}
            accessibilityLabelledBy="crux-ask-label"
            multiline
          />
        </TextField.Root>
      </View>
      <Button
        testID="cruxGameAskSend"
        label={_(msg`Ask`)}
        size="large"
        color="primary"
        variant="solid"
        disabled={!text.trim() || busy || loading}
        onPress={() => void ask()}>
        <ButtonText>
          <Trans>Ask</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}

function LetStand({claim}: {claim: GameClaim}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.text_sm,
        a.leading_snug,
        a.pl_lg,
        t.atoms.text_contrast_medium,
        {fontStyle: 'italic'},
      ]}>
      <Trans>let stand:</Trans> {claim.text}
    </Text>
  )
}

/**
 * §11.3: the claims both now hold, and the other's claims this viewer has
 * neither held nor disputed. A claim enters the block only when the player who
 * did not propose it says so in a move of their own (the contagion guard), so
 * Hold posts the agreement to the viewer's own repo and the record does the
 * rest.
 */
function TheBlock({game: g, iPlay}: {game: GameView['game']; iPlay: boolean}) {
  return (
    <View style={[a.gap_2xs]}>
      <HeadingText>
        <Trans>The block so far</Trans>
      </HeadingText>
      {g.block.length ? (
        g.block.map(c => (
          <LineText key={c.id}>
            {c.text}{' '}
            <QuietText>
              <Trans>— @{c.by} said it, both hold it</Trans>
            </QuietText>
          </LineText>
        ))
      ) : (
        <QuietText>
          <Trans>Nothing is held by both of you yet.</Trans>
        </QuietText>
      )}
      {iPlay
        ? g.canHold.map(c => (
            <HoldRow
              key={c.id}
              claim={c}
              falls={g.previews.find(p => p.claimId === c.id)?.falls ?? []}
            />
          ))
        : null}
    </View>
  )
}

function HoldRow({
  claim,
  falls,
}: {
  claim: GameClaim
  falls: {id: string; text: string}[]
}) {
  const t = useTheme()
  const {_} = useLingui()
  const post = usePostQuery(claim.postUri || undefined)
  const agree = useAgreeMutation()
  // Read off the query, never dereferenced inside the handler: the compiler
  // hoists a `post.data!.cid` in there into the render and it throws.
  const cid = post.data?.cid
  if (!claim.postUri) return null
  return (
    <View style={[a.gap_2xs, a.pt_xs]}>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_high]}>
        {claim.text}
      </Text>
      {falls.length ? (
        <QuietText>
          <Trans>Holding this takes back:</Trans>{' '}
          {falls.map(f => `“${f.text}”`).join(', ')}
        </QuietText>
      ) : null}
      <View style={[a.flex_row]}>
        <Button
          testID="cruxGameHold"
          label={_(msg`Hold`)}
          size="tiny"
          variant="outline"
          color="secondary"
          disabled={!cid || agree.isPending}
          onPress={() =>
            cid &&
            agree.mutate(
              {uri: claim.postUri, cid},
              {onSuccess: () => Toast.show(_(msg`Held. It is in the block.`))},
            )
          }>
          <ButtonText>
            <Trans>Hold</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

/**
 * The well known is pointed at (foundations §14.1 part 4; founder ruling,
 * 7 Sept 2026): the record already carries a reason for the claim this player
 * owes an answer for, given by somebody outside their store. Holding it makes
 * it theirs — clears what they owe, puts it among what they let stand, and
 * puts it where the other player may question it (§4). One agree record,
 * naming the claim of the post it holds.
 */
function RestOnRow({reason}: {reason: Owed['restOn'][number]}) {
  const t = useTheme()
  const {_} = useLingui()
  const post = usePostQuery(reason.postUri || undefined)
  const agree = useAgreeMutation()
  const cid = post.data?.cid
  return (
    <View style={[a.pl_md, a.gap_2xs]}>
      <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>the record already carries a reason, from @{reason.by}:</Trans> “
        {reason.text}”
      </Text>
      <View style={[a.flex_row]}>
        <Button
          testID="cruxGameRestOn"
          label={_(msg`Rest on this`)}
          size="tiny"
          variant="outline"
          color="secondary"
          disabled={!cid || agree.isPending}
          onPress={() =>
            cid &&
            agree.mutate(
              {uri: reason.postUri, cid, about: reason.id},
              {
                onSuccess: () =>
                  Toast.show(_(msg`Held. Your claim rests on it now.`)),
              },
            )
          }>
          <ButtonText>
            <Trans>Rest on this</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

/**
 * Rest on a chunk of shared knowledge (ruling 23; §14.1 part 4: the well
 * known is pointed at). The record retrieves the chunk nearest the questioned
 * claim (never merges, A8 ruling 3); the player decides. One reply at their
 * claim carrying the chunk's link is the move — the tie is the record's, the
 * claim then rests on the chunk, and the question is answered by pointing.
 */
function ChunkOffer({
  owed,
  me,
  rootUri,
  lastUri,
}: {
  owed: Owed
  me: string
  rootUri: string
  lastUri: string | undefined
}) {
  const t = useTheme()
  const {_} = useLingui()
  const near = useNearChunk(owed.claim, me)
  const {send, loading} = useReplySend(lastUri, ['crux-game', rootUri, me])
  const [busy, setBusy] = useState(false)
  const chunk = near.data?.chunk
  if (!chunk) return null
  const rest = async () => {
    if (busy) return
    setBusy(true)
    try {
      await send(`This rests on shared knowledge: ${chunk.url}`, {
        about: owed.claimId,
      })
      Toast.show(_(msg`Your claim rests on that chunk now.`))
    } catch (e) {
      Toast.show(_(msg`Could not rest on it: ${String(e)}`), {type: 'error'})
    } finally {
      setBusy(false)
    }
  }
  return (
    <View style={[a.pl_md, a.gap_2xs]}>
      <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>shared knowledge holds a chunk near this:</Trans> “
        {chunk.heading}”
      </Text>
      <View style={[a.flex_row]}>
        <Button
          testID="cruxGameRestOnChunk"
          label={_(msg`Rest on this chunk`)}
          size="tiny"
          variant="outline"
          color="secondary"
          disabled={busy || loading}
          onPress={() => void rest()}>
          <ButtonText>
            <Trans>Rest on this chunk</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

/**
 * §11.6 and §11.7: the ways a game ends, each a move in the player's own repo.
 * The machine's own refusal — it will not close while an answer is owed — is
 * server-side, so the desk says so in words when an acceptance did not make a
 * block.
 */
function CloseAndLeave({
  game: g,
  me,
  rootUri,
  updatedAt,
}: {
  game: GameView['game']
  me: string
  rootUri: string
  updatedAt: number
}) {
  const {_} = useLingui()
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const qc = useQueryClient()
  const leave = Prompt.usePromptControl()
  const [busy, setBusy] = useState(false)
  const [acceptedAt, setAcceptedAt] = useState(0)

  const move = async (kind: GameMoveKind) => {
    if (!currentAccount || busy) return
    setBusy(true)
    try {
      await pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did,
        collection: GAME_MOVE_COLLECTION,
        record: {
          $type: GAME_MOVE_COLLECTION,
          game: rootUri,
          kind,
          createdAt: new Date().toISOString(),
        },
      })
      if (kind === 'accept') setAcceptedAt(Date.now())
      void qc.invalidateQueries({queryKey: ['crux-game', rootUri, me]})
    } catch (e) {
      Toast.show((e as Error).message, {type: 'error'})
    } finally {
      setBusy(false)
    }
  }

  const iOffered = g.ending.kind === 'offered' && g.ending.by === me
  const theyOffered = g.ending.kind === 'offered' && g.ending.by !== me
  // The ending is reached: the moves below would land on a game nobody is playing.
  if (
    g.ending.kind !== 'open' &&
    g.ending.kind !== 'offered' &&
    g.ending.kind !== 'refused'
  )
    return null
  const iOwe = g.owed.find(o => o.by === me)
  // The refusal is server-side: a settled game shows as agreed and this whole
  // section is gone, so an acceptance still standing after a refetch is one the
  // machine would not take.
  const refused = acceptedAt > 0 && updatedAt > acceptedAt

  return (
    <View style={[a.gap_xs]}>
      <HeadingText>
        <Trans>Close and leave</Trans>
      </HeadingText>
      <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
        <Button
          testID="cruxGamePass"
          label={_(msg`Pass`)}
          size="tiny"
          variant="outline"
          color="secondary"
          disabled={busy}
          onPress={() => void move('pass')}>
          <ButtonText>
            <Trans>Pass</Trans>
          </ButtonText>
        </Button>
        {!iOffered ? (
          <Button
            testID="cruxGameOffer"
            label={_(msg`Offer to close`)}
            size="tiny"
            variant="outline"
            color="secondary"
            disabled={busy || g.offerLocked}
            onPress={() => void move('offer')}>
            <ButtonText>
              <Trans>Offer to close</Trans>
            </ButtonText>
          </Button>
        ) : null}
        {theyOffered ? (
          <Button
            testID="cruxGameAccept"
            label={_(msg`Accept the close`)}
            size="tiny"
            variant="solid"
            color="primary"
            disabled={busy}
            onPress={() => void move('accept')}>
            <ButtonText>
              <Trans>Accept the close</Trans>
            </ButtonText>
          </Button>
        ) : null}
        <Button
          testID="cruxGameLeave"
          label={_(msg`Leave this here`)}
          size="tiny"
          variant="outline"
          color="secondary"
          disabled={busy}
          onPress={() => leave.open()}>
          <ButtonText>
            <Trans>Leave this here</Trans>
          </ButtonText>
        </Button>
        <Button
          testID="cruxGameAway"
          label={_(msg`I'm away`)}
          size="tiny"
          variant="ghost"
          color="secondary"
          disabled={busy}
          onPress={() => void move('away')}>
          <ButtonText>
            <Trans>I'm away</Trans>
          </ButtonText>
        </Button>
        <Button
          testID="cruxGameContinue"
          label={_(msg`I'll continue`)}
          size="tiny"
          variant="ghost"
          color="secondary"
          disabled={busy}
          onPress={() => void move('continue')}>
          <ButtonText>
            <Trans>I'll continue</Trans>
          </ButtonText>
        </Button>
      </View>
      {iOwe ? (
        <QuietText>
          <Trans>
            Passing here records that you declined to defend “{iOwe.claim}”
          </Trans>
        </QuietText>
      ) : null}
      {g.offerLocked && !iOffered ? (
        <QuietText>
          <Trans>
            You offered; it was declined by play — the other player can offer
          </Trans>
        </QuietText>
      ) : null}
      {refused ? (
        <QuietText>
          <Trans>The close needs the open answers first</Trans>
        </QuietText>
      ) : null}
      <Prompt.Basic
        control={leave}
        title={_(msg`Leave this here`)}
        description={_(
          msg`This ends the game as left unfinished by you, on the record.`,
        )}
        confirmButtonCta={_(msg`Leave this here`)}
        onConfirm={() => void move('leave')}
      />
    </View>
  )
}
