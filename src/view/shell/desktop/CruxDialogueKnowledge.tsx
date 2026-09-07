import {useMemo, useState} from 'react'
import {TextInput, View} from 'react-native'
import * as ExpoClipboard from 'expo-clipboard'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQuery} from '@tanstack/react-query'

import {cruxGet} from '#/lib/crux'
import {useRoom} from '#/screens/Crux/Dialogue'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {InlineLinkText} from '#/components/Link'
import * as toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Index = {subjects: {name: string; chunks: number}[]}
type Chunk = {id: string; heading: string; url: string}
type Subject = {name: string; chunks: Chunk[]}

/**
 * The right column of a room (A8 ruling 4: the later design; this is the whole
 * bar for now): the Knowledge chunks the dialogue's messages rest on so far,
 * and a search over Knowledge whose Copy link gives the URL a message pastes
 * to rest on a chunk (A7 ruling 4). Web only, like the rest of the right bar.
 */
export function CruxDialogueKnowledge({id: param}: {id?: string | undefined}) {
  const t = useTheme()
  const {_} = useLingui()
  // ponytail: the room's id is read from the URL, since the right column sits
  //   outside the screen's navigator on web.
  //   Ceiling: native, or a route shape other than /dialogue/:id.
  //   Upgrade: the screen publishes its id through a context the bar reads.
  const id = param ? decodeURIComponent(param) : ''
  const room = useRoom(id)
  const index = useQuery({
    queryKey: ['crux-knowledge'],
    queryFn: () => cruxGet<Index>('/knowledge'),
  })
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return (index.data?.subjects ?? [])
      .filter(s => s.name.toLowerCase().includes(needle))
      .slice(0, 5)
  }, [q, index.data])
  const first = matches[0]?.name
  const subject = useQuery({
    queryKey: ['crux-knowledge', first],
    enabled: !!first,
    queryFn: () => cruxGet<Subject>(`/knowledge/${encodeURIComponent(first)}`),
  })
  const restsOn = useMemo(() => {
    const seen = new Map<
      string,
      {id: string; heading: string | null; url: string}
    >()
    for (const m of room.data?.messages ?? [])
      for (const c of m.restsOn) seen.set(c.id, c)
    return [...seen.values()]
  }, [room.data])
  const copy = async (c: Chunk) => {
    await ExpoClipboard.setStringAsync(c.url)
    toast.show(
      _(msg`Link copied — paste it in a message to rest on this chunk`),
    )
  }

  return (
    <View
      testID="cruxDialogueKnowledge"
      style={[
        a.gap_sm,
        a.p_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.text_md, a.font_bold]}>
        <Trans>Knowledge</Trans>
      </Text>
      {restsOn.length ? (
        <View style={[a.gap_2xs]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>This dialogue rests on</Trans>
          </Text>
          {restsOn.map(c => (
            <InlineLinkText
              key={c.id}
              to={c.url}
              label={_(msg`Open the chunk`)}
              style={[a.text_sm]}>
              {c.heading ?? c.id}
            </InlineLinkText>
          ))}
        </View>
      ) : (
        <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>Nothing here rests on a chunk yet.</Trans>
        </Text>
      )}
      <TextInput
        testID="cruxKnowledgeSearch"
        accessibilityLabel={_(msg`Find a chunk`)}
        accessibilityHint={_(msg`Searches Knowledge by subject`)}
        placeholder={_(msg`Find a chunk`)}
        placeholderTextColor={t.atoms.text_contrast_low.color}
        value={q}
        onChangeText={setQ}
        style={[
          a.px_md,
          a.py_sm,
          a.rounded_sm,
          a.border,
          a.text_sm,
          t.atoms.border_contrast_low,
          t.atoms.text,
          t.atoms.bg_contrast_25,
        ]}
      />
      {first && subject.data ? (
        <View style={[a.gap_xs]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {subject.data.name}
          </Text>
          {subject.data.chunks.slice(0, 6).map(c => (
            <View
              key={c.id}
              style={[a.flex_row, a.align_center, a.justify_between, a.gap_sm]}>
              <Text
                style={[a.text_sm, a.flex_1, a.leading_snug]}
                numberOfLines={2}>
                {c.heading}
              </Text>
              <Button
                testID="cruxKnowledgeCopy"
                label={_(msg`Copy link`)}
                size="tiny"
                variant="outline"
                color="secondary"
                onPress={() => void copy(c)}>
                <ButtonText>
                  <Trans>Copy link</Trans>
                </ButtonText>
              </Button>
            </View>
          ))}
        </View>
      ) : q.trim() && index.data && !matches.length ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>No subject by that name.</Trans>
        </Text>
      ) : null}
    </View>
  )
}
