import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type Block, useKnowledge} from '#/lib/crux'
import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * Knowledge (A7 ruling 3): the global database of agreed shared context. Its
 * unit on this surface is the block — the claims two players both held when
 * their game closed (A8: a dialogue is where a chunk is composed). Nothing a
 * single person merely posted is listed here. Reachable, never in front (A6
 * ruling 4).
 */
export function KnowledgeScreen() {
  const t = useTheme()
  const index = useKnowledge()
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
            <Text style={[a.text_sm]}>{String(index.error.message)}</Text>
          ) : index.data && index.data.blocks.length === 0 ? (
            <Text
              style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>
                Nothing has been settled here yet. A block is made when two
                people close a game agreed.
              </Trans>
            </Text>
          ) : (
            index.data?.blocks.map(b => <BlockRow key={b.id} block={b} />)
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

/** One block, the shape of a row on the Games page: the question, then what both hold and by whom. */
function BlockRow({block}: {block: Block}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  return (
    <Button
      testID="cruxKnowledgeBlock"
      label={block.question}
      onPress={() => navigation.navigate('KnowledgeBlock', {id: block.id})}
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
          {block.question}
        </Text>
        <Text style={[a.text_md, a.leading_snug, a.text_left]}>
          {block.paragraph.join(' ')}
        </Text>
        <Text style={[a.text_sm, a.text_left, t.atoms.text_contrast_medium]}>
          <HeldBy block={block} />
          {block.earlier ? (
            <>
              {' · '}
              {block.earlier === 1 ? (
                <Trans>1 earlier block at this question</Trans>
              ) : (
                <Trans>{block.earlier} earlier blocks at this question</Trans>
              )}
            </>
          ) : null}
        </Text>
      </View>
    </Button>
  )
}

/** "Held by @a and @b · 7 Sept 2026", said once for the row and the page (R3.3). */
export function HeldBy({block}: {block: Block}) {
  const [x, y] = block.holders
  const when = new Date(block.madeAt).toLocaleDateString()
  return (
    <Trans>
      Held by @{x} and @{y} · {when}
    </Trans>
  )
}
