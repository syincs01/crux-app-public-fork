import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQuery} from '@tanstack/react-query'

import {cruxGet} from '#/lib/crux'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {usePostQuery} from '#/state/queries/post'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'

export type Room = {
  id: string
  question: string
  root: {uri: string; speaker: string; text: string}
  messages: {
    uri: string
    speaker: string
    text: string
    at: string
    move: string | null
    restsOn: {id: string; heading: string | null; url: string}[]
  }[]
  folded: {uri: string; speaker: string; text: string}[]
  lastUri: string
}

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

/**
 * The room (A8 ruling 8): a dialogue in chat form. The post pinned at the top,
 * the folded moves as messages with what each did in the record's English
 * beneath, the replies that made no move behind a fold, and the platform's own
 * composer at the foot — a message is a reply on the firehose, compiled and
 * folded by the same rule. For someone not yet in it the composer is the door:
 * what they write carries them in if it bears on the question; if it does not,
 * the record says so and asks (§8) — never a refusal. A dialogue never closes.
 */
export function DialogueScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'Dialogue'>) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {openComposer} = useOpenComposer()
  const id = decodeURIComponent(route.params.id)
  const room = useRoom(id)
  const last = usePostQuery(room.data?.lastUri)
  const [showFolded, setShowFolded] = useState(false)
  const me = currentAccount?.handle
  const inRoom = !!me && !!room.data?.messages.some(m => m.speaker === me)
  const myFolded = me
    ? (room.data?.folded.filter(f => f.speaker === me) ?? [])
    : []

  const write = () => {
    const post = last.data
    if (!post) return
    const record = post.record as {text?: string; langs?: string[]}
    openComposer({
      replyTo: {
        uri: post.uri,
        cid: post.cid,
        text: record.text ?? '',
        author: post.author,
        embed: post.embed,
        langs: record.langs,
      },
      logContext: 'PostReply',
    })
  }

  return (
    <Layout.Screen testID="cruxDialogueScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Dialogue</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_lg]}>
          {room.error ? (
            <Text style={[a.text_sm]}>
              <Trans>Crux is not answering:</Trans> {String(room.error.message)}
            </Text>
          ) : room.data ? (
            <>
              <Text
                testID="cruxDialogueQuestion"
                style={[a.text_2xl, a.font_bold, a.leading_snug]}>
                {room.data.question}
              </Text>

              <View
                testID="cruxDialogueRoot"
                style={[
                  a.p_md,
                  a.rounded_md,
                  a.border,
                  t.atoms.border_contrast_low,
                  t.atoms.bg_contrast_25,
                  a.gap_2xs,
                ]}>
                <Text style={[a.text_sm, a.font_bold]}>
                  @{room.data.root.speaker}
                </Text>
                <Text style={[a.text_md, a.leading_snug]}>
                  {room.data.root.text}
                </Text>
              </View>

              <View style={[a.gap_md]}>
                {room.data.messages.map(m => (
                  <View
                    key={m.uri}
                    testID="cruxDialogueMessage"
                    style={[
                      a.p_md,
                      a.rounded_md,
                      a.gap_2xs,
                      m.speaker === me
                        ? t.atoms.bg_contrast_50
                        : t.atoms.bg_contrast_25,
                      m.speaker === me ? {marginLeft: 32} : {marginRight: 32},
                    ]}>
                    <Text style={[a.text_sm, a.font_bold]}>@{m.speaker}</Text>
                    <Text style={[a.text_md, a.leading_snug]}>{m.text}</Text>
                    {m.move ? (
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        {m.move}
                      </Text>
                    ) : null}
                    {m.restsOn.map(c => (
                      <InlineLinkText
                        key={c.id}
                        to={c.url}
                        label={_(msg`Open the chunk this rests on`)}
                        style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        {_(msg`rests on:`)} {c.heading ?? c.id}
                      </InlineLinkText>
                    ))}
                  </View>
                ))}
              </View>

              {room.data.folded.length > 0 ? (
                <View style={[a.gap_sm]}>
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
                        : _(msg`${room.data.folded.length} other replies here`)}
                    </ButtonText>
                  </Button>
                  {showFolded
                    ? room.data.folded.map(f => (
                        <View key={f.uri} style={[a.px_md, a.gap_2xs]}>
                          <Text
                            style={[a.text_xs, t.atoms.text_contrast_medium]}>
                            @{f.speaker}
                          </Text>
                          <Text
                            style={[a.text_sm, t.atoms.text_contrast_medium]}>
                            {f.text}
                          </Text>
                        </View>
                      ))
                    : null}
                </View>
              ) : null}

              {myFolded.length > 0 && !inRoom ? (
                <Text
                  testID="cruxDialogueNotBearing"
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    This did not bear on the question — what are you bringing to
                    it?
                  </Trans>
                </Text>
              ) : null}

              <View
                style={[
                  a.gap_sm,
                  a.pt_md,
                  a.border_t,
                  t.atoms.border_contrast_low,
                ]}>
                {!inRoom ? (
                  <Text
                    style={[
                      a.text_sm,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Say what you are bringing to this question.</Trans>
                  </Text>
                ) : null}
                <Button
                  testID="cruxDialogueWrite"
                  label={_(msg`Write a message`)}
                  size="large"
                  color="primary"
                  disabled={!last.data}
                  onPress={write}>
                  <ButtonText>
                    <Trans>Write a message</Trans>
                  </ButtonText>
                </Button>
              </View>
            </>
          ) : null}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
