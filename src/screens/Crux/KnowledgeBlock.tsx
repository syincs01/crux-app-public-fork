import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useBlock} from '#/lib/crux'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {HeldBy} from '#/screens/Crux/Knowledge'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * One block (A7 ruling 3): the question it was played at, the claims both
 * players held when the game closed, who holds it, and the game it came
 * from — the record beneath is never deleted (§30), so the game is the
 * block's history.
 */
export function KnowledgeBlockScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'KnowledgeBlock'>) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const block = useBlock(route.params.id)
  const b = block.data
  return (
    <Layout.Screen testID="cruxKnowledgeBlockScreen">
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
        <View style={[a.px_lg, a.py_lg, a.gap_lg]}>
          {block.error ? (
            <Text style={[a.text_sm]}>{String(block.error.message)}</Text>
          ) : b ? (
            <>
              <Text style={[a.text_lg, a.font_bold, a.leading_snug]}>
                {b.question}
              </Text>
              <Text
                testID="cruxBlockParagraph"
                style={[a.text_md, a.leading_relaxed]}>
                {b.paragraph.join(' ')}
              </Text>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <HeldBy block={b} />
                {b.version > 1 ? (
                  <>
                    {' · '}
                    <Trans>version {b.version}</Trans>
                  </>
                ) : null}
              </Text>
              <Button
                testID="cruxBlockGameLink"
                label="The game it came from"
                size="small"
                color="secondary"
                onPress={() =>
                  navigation.navigate('Game', {
                    uri: encodeURIComponent(b.game.root),
                  })
                }
                style={[a.self_start]}>
                <ButtonText>
                  <Trans>The game it came from</Trans>
                </ButtonText>
              </Button>
            </>
          ) : null}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
