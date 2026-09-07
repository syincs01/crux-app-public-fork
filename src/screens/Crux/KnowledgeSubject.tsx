import {View} from 'react-native'
import * as ExpoClipboard from 'expo-clipboard'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQuery} from '@tanstack/react-query'

import {cruxGet} from '#/lib/crux'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import * as toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Chunk = {
  id: string
  heading: string
  url: string
  sentences: string[]
  standing: string
}
type Subject = {name: string; chunks: Chunk[]}

/**
 * One subject's chunks (A7 ruling 3). Each is one section of the living
 * document, identified by its anchor claim. "Copy link" gives the URL a post
 * links to rest on the chunk (A7 ruling 4): the tie is a premise, and standing
 * flows through it.
 */
export function KnowledgeSubjectScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'KnowledgeSubject'>) {
  const {_} = useLingui()
  const t = useTheme()
  const name = decodeURIComponent(route.params.name)
  const subject = useQuery({
    queryKey: ['crux-knowledge', name],
    queryFn: () => cruxGet<Subject>(`/knowledge/${encodeURIComponent(name)}`),
  })
  const copy = async (c: Chunk) => {
    await ExpoClipboard.setStringAsync(c.url)
    toast.show(_(msg`Link copied — paste it in a post to rest on this.`), {
      type: 'success',
    })
  }
  return (
    <Layout.Screen testID="cruxKnowledgeSubjectScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{name}</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_xl]}>
          {subject.error ? (
            <Text style={[a.text_sm]}>{String(subject.error.message)}</Text>
          ) : (
            subject.data?.chunks.map(c => (
              <View
                key={c.id}
                testID="cruxKnowledgeChunk"
                style={[
                  a.rounded_md,
                  a.border,
                  a.p_lg,
                  a.gap_md,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_lg, a.font_bold, a.leading_snug]}>
                  {c.heading}
                </Text>
                {c.sentences.map((s, i) => (
                  <Text key={i} style={[a.text_md, a.leading_snug]}>
                    {s}
                  </Text>
                ))}
                <View
                  style={[
                    a.flex_row,
                    a.justify_between,
                    a.align_center,
                    a.pt_sm,
                  ]}>
                  <Text
                    style={[a.text_sm, t.atoms.text_contrast_medium, a.flex_1]}>
                    {c.standing}
                  </Text>
                  <Button
                    label={_(msg`Copy link`)}
                    testID="cruxChunkCopyLink"
                    size="small"
                    color="secondary"
                    onPress={() => void copy(c)}>
                    <ButtonText>
                      <Trans>Copy link</Trans>
                    </ButtonText>
                  </Button>
                </View>
              </View>
            ))
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
