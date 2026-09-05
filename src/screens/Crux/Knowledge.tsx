import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useQuery} from '@tanstack/react-query'

import {cruxGet} from '#/lib/crux'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'

type Index = {subjects: {name: string; chunks: number}[]}

/**
 * Knowledge (A7 ruling 3): the global database of chunks. A subject is a
 * place (A4's third ruling stands); it opens into the chunks its living
 * document holds. Reachable, never in front (A6 ruling 4).
 */
export function KnowledgeScreen() {
  const t = useTheme()
  const index = useQuery({
    queryKey: ['crux-knowledge'],
    queryFn: () => cruxGet<Index>('/knowledge'),
  })
  return (
    <Layout.Screen testID="cruxKnowledgeScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Knowledge</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_md]}>
          {index.error ? (
            <Text style={[a.text_sm]}>
              <Trans>Crux is not answering:</Trans>{' '}
              {String(index.error.message)}
            </Text>
          ) : index.data && index.data.subjects.length === 0 ? (
            <Text
              style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>
                Nothing has been settled here yet. Knowledge fills in as people
                argue.
              </Trans>
            </Text>
          ) : (
            index.data?.subjects.map(s => (
              <View
                key={s.name}
                testID="cruxKnowledgeSubject"
                style={[
                  a.flex_row,
                  a.justify_between,
                  a.align_center,
                  a.py_md,
                  a.border_b,
                  t.atoms.border_contrast_low,
                ]}>
                <InlineLinkText
                  label={s.name}
                  to={`/knowledge/${encodeURIComponent(s.name)}`}
                  style={[a.text_md, a.font_bold]}>
                  {s.name}
                </InlineLinkText>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {s.chunks === 1 ? (
                    <Trans>1 chunk</Trans>
                  ) : (
                    <Trans>{s.chunks} chunks</Trans>
                  )}
                </Text>
              </View>
            ))
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
