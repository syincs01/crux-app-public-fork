import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Bubble_Stroke2_Corner2_Rounded as Bubble} from '#/components/icons/Bubble'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'

/**
 * A8 ruling 8: in the thread a dialogue is ONE LINE where its first reply was —
 * a small muted label "dialogue", a bubble and the number of people with a
 * message in it (a count the surface may show, A6 ruling 5; nothing reads it),
 * then the question underlined in the platform's link style. No names, nothing
 * else. The folded exchange is behind the link.
 */
export function ThreadItemDialogue({
  id,
  question,
  people,
}: {
  id: string
  question: string
  people: number
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      testID="cruxDialogueLine"
      style={[
        a.px_lg,
        a.py_md,
        a.gap_xs,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>dialogue</Text>
        <Bubble size="xs" fill={t.atoms.text_contrast_medium.color} />
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{people}</Text>
      </View>
      <InlineLinkText
        to={`/dialogue/${encodeURIComponent(id)}`}
        label={_(msg`Open the dialogue`)}
        style={[a.text_md, a.leading_snug, a.underline]}>
        {question}
      </InlineLinkText>
    </View>
  )
}
