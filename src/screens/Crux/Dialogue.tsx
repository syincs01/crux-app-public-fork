import {useMemo, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {moderateProfile} from '@bsky/sdk/moderation'
import {RichText as RichTextAPI} from '@bsky/sdk/richtext'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {cruxGet, type Room} from '#/lib/crux'
import {createSanitizedDisplayName} from '#/lib/moderation/create-sanitized-display-name'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {usePostQuery} from '#/state/queries/post'
import {useProfilesQuery} from '#/state/queries/profile'
import {usePdsClient, useSession} from '#/state/session'
import {Post} from '#/view/com/post/Post'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {MessageComposer} from '#/screens/Messages/components/MessageComposer'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {DateDivider} from '#/components/dms/DateDivider'
import {MessageRepliesProvider} from '#/components/dms/MessageReplies'
import {
  MESSAGE_BUBBLE_MAX_WIDTH,
  MESSAGE_GAP_THRESHOLD_MS,
} from '#/components/dms/util'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import * as ProfileCard from '#/components/ProfileCard'
import {RichText} from '#/components/RichText'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {com} from '#/lexicons'
import type * as bsky from '#/types/bsky'

export type {Room}

export function useRoom(id: string) {
  return useQuery({
    queryKey: ['crux-dialogue', id],
    queryFn: () => cruxGet<Room>(`/dialogue?id=${encodeURIComponent(id)}`),
    // ponytail: the room polls the bridge while open, so a message posted a
    //   moment ago (compiled off the firehose) appears without a reload.
    //   Ceiling: many open rooms, or a bridge that compiles slower than 5 s.
    //   Upgrade: the bridge relays the firehose (a server-sent stream per room).
    refetchInterval: 5000,
  })
}

// The platform's own bubble geometry (components/dms/MessageItem.tsx).
const AVATAR_SIZE = 28
const BORDER_RADIUS = 20
const SQUARED_BORDER_RADIUS = 4
const CLUSTERED_MESSAGE_GAP = 2
const DISPLAY_NAME_INSET = 20

type Bubble = {
  key: string
  did: string
  text: string
  at: string
  caption: string | null
  restsOn: Room['messages'][number]['restsOn']
  pending?: boolean
}

/**
 * The reply a message is: a post under the last of the room, on the same root,
 * so the firehose compiles it as the next turn. The room and the game send the
 * same way, so the two cannot drift (R3.3).
 */
export function useReplySend(
  lastUri: string | undefined,
  invalidate: readonly unknown[],
) {
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const lastPost = usePostQuery(lastUri)
  const me = currentAccount?.did
  return {
    loading: !lastPost.data,
    send: async (text: string) => {
      const parent = lastPost.data
      if (!me || !parent) throw new Error('the room has not loaded')
      const record = parent.record as {
        reply?: {root: {uri: string; cid: string}}
      }
      const root = record.reply?.root ?? {uri: parent.uri, cid: parent.cid}
      await pdsClient.call(com.atproto.repo.createRecord, {
        repo: me,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text,
          createdAt: new Date().toISOString(),
          reply: {root, parent: {uri: parent.uri, cid: parent.cid}},
        },
      })
      void queryClient.invalidateQueries({queryKey: invalidate})
    },
  }
}

/**
 * The room (A8 ruling 8): a dialogue in the platform's chat form. The post the
 * dialogue is under, pinned as the platform's own post card; the moves as
 * message bubbles with the platform's bubble rules (clusters, corners, own
 * messages right in the primary colour, others left with avatar and name when
 * more than two are talking); beneath each, what the record read it as doing;
 * the platform's message composer at the foot — a message is a reply on the
 * firehose, compiled and folded by the same rule. A newcomer's composer is the
 * door: their words carry them in if they bear on the question; if not, the
 * record says so and asks (§8), never refuses. A dialogue never closes.
 *
 * A game is played in this same room (the game page §3), so everything from the
 * screen down lives here and the two screens differ only in what they read and
 * in the one line they put above the composer.
 */
export function RoomBody({
  room,
  titleText,
  testID,
  send,
  sendLoading,
  viewerDid,
  extraAboveComposer,
}: {
  room: {data?: Room; error?: {message: string} | null}
  titleText: React.ReactNode
  testID: string
  send: (text: string) => Promise<void>
  sendLoading: boolean
  viewerDid: string | undefined
  extraAboveComposer?: React.ReactNode
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const rootPost = usePostQuery(room.data?.root.uri)
  const [showFolded, setShowFolded] = useState(false)
  const [pending, setPending] = useState<Bubble[]>([])

  const me = viewerDid
  const myHandle = currentAccount?.handle
  const inRoom =
    !!myHandle && !!room.data?.messages.some(m => m.speaker === myHandle)
  const myFolded = myHandle
    ? (room.data?.folded.filter(f => f.speaker === myHandle) ?? [])
    : []

  const handles = useMemo(() => {
    const set = new Set<string>()
    for (const m of room.data?.messages ?? []) set.add(m.speaker)
    return [...set]
  }, [room.data])
  const profiles = useProfilesQuery({handles})
  const profileOf = useMemo(() => {
    const map = new Map<string, bsky.profile.AnyProfileView>()
    for (const p of profiles.data?.profiles ?? []) map.set(p.did, p)
    return map
  }, [profiles.data])

  // A pending bubble shows until the record shows the same words as a message or folds them.
  const bubbles: Bubble[] = useMemo(() => {
    const said = new Set([
      ...(room.data?.messages ?? []).map(m => m.text),
      ...(room.data?.folded ?? []).map(f => f.text),
    ])
    return [
      ...(room.data?.messages ?? []).map(m => ({
        key: m.uri,
        did: m.did,
        text: m.text,
        at: m.at,
        caption: m.move,
        restsOn: m.restsOn,
      })),
      ...pending.filter(b => !said.has(b.text)),
    ]
  }, [room.data, pending])
  const isGroup = useMemo(
    () => new Set(bubbles.map(b => b.did).filter(d => d !== me)).size > 1,
    [bubbles, me],
  )

  const onSend = async (text: string) => {
    if (!me || !text.trim()) return
    setPending(p => [
      ...p,
      {
        key: `pending:${Date.now()}`,
        did: me,
        text,
        at: new Date().toISOString(),
        caption: null,
        restsOn: [],
        pending: true,
      },
    ])
    try {
      await send(text)
    } catch {
      setPending(p => p.filter(b => b.text !== text))
      Toast.show(_(msg`Could not send your message`), {type: 'error'})
    }
  }

  return (
    <Layout.Screen testID={testID}>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{titleText}</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={[a.flex_1]}>
        <View style={[a.flex_1]}>
          <ScrollView
            // ponytail: the list is bottom-aligned when short and starts at the
            //   top when long, where the platform's chat starts at the bottom.
            //   Ceiling: a room longer than one screen, opened cold.
            //   Upgrade: the platform's List with maintainVisibleContentPosition
            //     and an initial scroll to the end, as MessagesList does.
            style={[a.flex_1]}
            contentContainerStyle={[a.flex_grow, a.justify_end, a.pb_md]}>
            {room.error ? (
              <Text style={[a.text_sm, a.px_lg, a.py_lg]}>
                <Trans>Crux is not answering:</Trans>{' '}
                {String(room.error.message)}
              </Text>
            ) : room.data ? (
              <>
                <View style={[a.border_b, t.atoms.border_contrast_low]}>
                  <Text
                    testID="cruxDialogueQuestion"
                    style={[
                      a.px_lg,
                      a.pt_lg,
                      a.pb_sm,
                      a.text_lg,
                      a.font_bold,
                      a.leading_snug,
                    ]}>
                    {room.data.question}
                  </Text>
                  {rootPost.data ? (
                    <View testID="cruxDialogueRoot">
                      <Post post={rootPost.data} hideTopBorder />
                    </View>
                  ) : null}
                </View>

                {bubbles.map((b, i) => (
                  <DialogueBubble
                    key={b.key}
                    bubble={b}
                    prev={bubbles[i - 1]}
                    next={bubbles[i + 1]}
                    isFromSelf={b.did === me}
                    isGroup={isGroup}
                    profile={profileOf.get(b.did)}
                  />
                ))}

                {room.data.folded.length > 0 ? (
                  <View style={[a.mt_lg]}>
                    <View style={[a.align_center]}>
                      <Button
                        testID="cruxDialogueFold"
                        label={_(msg`Other replies here`)}
                        size="small"
                        variant="ghost"
                        color="secondary"
                        onPress={() => setShowFolded(v => !v)}>
                        <ButtonText>
                          {room.data.folded.length === 1
                            ? _(msg`1 other reply here`)
                            : _(
                                msg`${room.data.folded.length} other replies here`,
                              )}
                        </ButtonText>
                      </Button>
                    </View>
                    {showFolded ? (
                      <View style={[a.border_t, t.atoms.border_contrast_low]}>
                        {room.data.folded.map(f => (
                          <FoldedReply key={f.uri} uri={f.uri} />
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {myFolded.length > 0 && !inRoom ? (
                  <Text
                    testID="cruxDialogueNotBearing"
                    style={[
                      a.px_lg,
                      a.pt_md,
                      a.text_sm,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>
                      This did not bear on the question — what are you bringing
                      to it?
                    </Trans>
                  </Text>
                ) : null}
                {!inRoom && myFolded.length === 0 ? (
                  <Text
                    style={[
                      a.px_lg,
                      a.pt_md,
                      a.text_sm,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Say what you are bringing to this question.</Trans>
                  </Text>
                ) : null}
              </>
            ) : null}
          </ScrollView>
          {extraAboveComposer}
          <MessageRepliesProvider scrollToMessage={() => false}>
            <MessageComposer
              onSendMessage={text => void onSend(text)}
              messageEmbed={undefined}
              setEmbed={() => {}}
              loading={sendLoading}
            />
          </MessageRepliesProvider>
        </View>
      </Layout.Center>
    </Layout.Screen>
  )
}

/** A dialogue: the room over `/dialogue`, with nothing above the composer. */
export function DialogueScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'Dialogue'>) {
  const {currentAccount} = useSession()
  const id = decodeURIComponent(route.params.id)
  const room = useRoom(id)
  const {send, loading} = useReplySend(room.data?.lastUri, [
    'crux-dialogue',
    id,
  ])
  return (
    <RoomBody
      testID="cruxDialogueScreen"
      titleText={<Trans>Dialogue</Trans>}
      room={room}
      send={send}
      sendLoading={loading}
      viewerDid={currentAccount?.did}
    />
  )
}

/** One folded reply, as the platform's own post cell (a reply that made no move at the question). */
function FoldedReply({uri}: {uri: string}) {
  const post = usePostQuery(uri)
  return post.data ? <Post post={post.data} hideTopBorder /> : null
}

/**
 * The platform's message bubble, by its own rules (components/dms/MessageItem):
 * own messages right in primary, others left in contrast; consecutive messages
 * from one sender cluster with squared inner corners; in a group the first of a
 * cluster carries the sender's name and the last their avatar; a long gap gets
 * a date divider. Beneath the last of a cluster: what the record read it as.
 */
function DialogueBubble({
  bubble,
  prev,
  next,
  isFromSelf,
  isGroup,
  profile,
}: {
  bubble: Bubble
  prev?: Bubble
  next?: Bubble
  isFromSelf: boolean
  isGroup: boolean
  profile?: bsky.profile.AnyProfileView
}) {
  const t = useTheme()
  const {_} = useLingui()
  const moderationOpts = useModerationOpts()
  const sameAsPrev = !!prev && prev.did === bubble.did
  const sameAsNext = !!next && next.did === bubble.did
  const isFirst = !sameAsPrev
  const isLast = !sameAsNext
  const largeGap =
    !prev ||
    new Date(bubble.at).getTime() - new Date(prev.at).getTime() >
      MESSAGE_GAP_THRESHOLD_MS
  const squaredBottom = !isLast
  const squaredTop = !isFirst
  const bubbleColor = isFromSelf
    ? bubble.pending
      ? t.palette.primary_300
      : t.palette.primary_500
    : t.palette.contrast_50
  const rt = new RichTextAPI({text: bubble.text})
  const displayName = profile ? createSanitizedDisplayName(profile) : null
  const showName = isGroup && !isFromSelf && isFirst
  const showAvatar = isGroup && !isFromSelf && isLast
  const radii = isFromSelf
    ? {
        borderBottomRightRadius: squaredBottom
          ? SQUARED_BORDER_RADIUS
          : BORDER_RADIUS,
        borderTopRightRadius: squaredTop
          ? SQUARED_BORDER_RADIUS
          : BORDER_RADIUS,
      }
    : {
        borderBottomLeftRadius: squaredBottom
          ? SQUARED_BORDER_RADIUS
          : BORDER_RADIUS,
        borderTopLeftRadius: squaredTop ? SQUARED_BORDER_RADIUS : BORDER_RADIUS,
      }
  return (
    <>
      {largeGap && <DateDivider date={bubble.at} />}
      <View
        testID="cruxDialogueMessage"
        style={[
          a.mx_lg,
          isFirst ? a.mt_md : {marginTop: CLUSTERED_MESSAGE_GAP},
        ]}>
        <View style={[a.relative]}>
          {showAvatar ? (
            <View style={[a.absolute, a.bottom_0, a.z_50]}>
              {profile && moderationOpts ? (
                <PreviewableUserAvatar
                  profile={profile}
                  size={AVATAR_SIZE}
                  type={profile.associated?.labeler ? 'labeler' : 'user'}
                  moderation={moderateProfile(profile, moderationOpts).ui(
                    'avatar',
                  )}
                />
              ) : (
                <ProfileCard.AvatarPlaceholder size={AVATAR_SIZE} />
              )}
            </View>
          ) : null}
          <View
            style={[
              a.relative,
              a.flex_grow,
              !isFromSelf && isGroup && {paddingLeft: AVATAR_SIZE},
            ]}>
            {displayName && showName ? (
              <Text
                style={[
                  a.text_xs,
                  t.atoms.text_contrast_medium,
                  a.pt_xs,
                  a.pb_2xs,
                  {paddingLeft: DISPLAY_NAME_INSET},
                ]}
                emoji>
                {displayName}
              </Text>
            ) : null}
            <View
              style={[
                !isFromSelf && isGroup && a.ml_sm,
                a.rounded_xl,
                a.py_sm,
                a.px_md,
                {
                  maxWidth: MESSAGE_BUBBLE_MAX_WIDTH,
                  backgroundColor: bubbleColor,
                },
                isFromSelf ? a.self_end : a.self_start,
                radii,
              ]}>
              <RichText
                value={rt}
                style={[a.text_md, isFromSelf && {color: t.palette.white}]}
                interactiveStyle={a.underline}
                enableTags
              />
            </View>
          </View>
        </View>
        {isLast && (bubble.caption || bubble.restsOn.length > 0) ? (
          <View
            style={[
              !isFromSelf &&
                isGroup && {paddingLeft: AVATAR_SIZE + a.ml_sm.marginLeft},
              a.pt_2xs,
            ]}>
            {bubble.caption ? (
              <Text
                style={[
                  a.text_xs,
                  t.atoms.text_contrast_medium,
                  isFromSelf ? a.text_right : a.text_left,
                ]}>
                {bubble.caption}
              </Text>
            ) : null}
            {bubble.restsOn.map(c => (
              <InlineLinkText
                key={c.id}
                to={c.url}
                label={_(msg`Open the chunk this rests on`)}
                style={[
                  a.text_xs,
                  t.atoms.text_contrast_medium,
                  isFromSelf ? a.text_right : a.text_left,
                ]}>
                {_(msg`rests on:`)} {c.heading ?? c.id}
              </InlineLinkText>
            ))}
          </View>
        ) : null}
      </View>
    </>
  )
}
