import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {atoms as a, useTheme, web} from '#/alf'
import {AvatarStackWithFetch} from '#/components/AvatarStack'
import {Bubble_Stroke2_Corner2_Rounded as Bubble} from '#/components/icons/Bubble'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRight} from '#/components/icons/Chevron'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

const AVATAR_SIZE = 36

/**
 * A8 ruling 8: in the thread a dialogue is one row where its first reply was,
 * and the row is the platform's own chat-list row (screens/Messages/ChatListItem):
 * the people in it as a stack of avatars, the question as the title, when it
 * last moved, a preview of the last message with the number of people — a count
 * the surface may show (A6 ruling 5), and nothing reads. The exchange is behind
 * the row. No names in the title (founder, 5 September).
 */
export function ThreadItemDialogue({
  id,
  question,
  people,
  participants,
  last,
}: {
  id: string
  question: string
  people: number
  participants: string[]
  last: {speaker: string; text: string; at: string} | null
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      testID="cruxDialogueLine"
      style={[a.border_b, t.atoms.border_contrast_low]}>
      <Link
        to={`/dialogue/${encodeURIComponent(id)}`}
        label={_(msg`Open the dialogue: ${question}`)}>
        {({hovered, pressed, focused}) => (
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.flex_1,
              a.px_lg,
              a.py_md,
              a.gap_md,
              {backgroundColor: t.palette.contrast_0},
              (hovered || pressed || focused) && t.atoms.bg_contrast_25,
            ]}>
            <View style={[{minWidth: AVATAR_SIZE}, a.align_center]}>
              <AvatarStackWithFetch
                profiles={participants.slice(0, 3)}
                size={AVATAR_SIZE}
                backgroundColor={t.palette.contrast_0}
              />
            </View>
            <View style={[a.flex_1, a.justify_center, web({paddingRight: 8})]}>
              <View
                style={[
                  a.w_full,
                  a.flex_row,
                  a.align_center,
                  a.pb_2xs,
                  a.gap_xs,
                ]}>
                <Text
                  emoji
                  numberOfLines={2}
                  style={[
                    a.flex_1,
                    a.text_md,
                    t.atoms.text,
                    a.font_semi_bold,
                    {lineHeight: 21},
                  ]}>
                  {question}
                </Text>
                {last ? (
                  <TimeElapsed timestamp={last.at}>
                    {({timeElapsed}) => (
                      <Text
                        style={[
                          a.text_sm,
                          {lineHeight: 21},
                          t.atoms.text_contrast_medium,
                          web({whiteSpace: 'preserve nowrap'}),
                        ]}>
                        {timeElapsed}
                      </Text>
                    )}
                  </TimeElapsed>
                ) : null}
              </View>
              <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                <Bubble size="xs" fill={t.atoms.text_contrast_medium.color} />
                <Text
                  style={[
                    a.text_sm,
                    t.atoms.text_contrast_medium,
                    {lineHeight: 20},
                  ]}>
                  {people}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    a.flex_1,
                    a.text_sm,
                    t.atoms.text_contrast_medium,
                    {lineHeight: 20},
                  ]}>
                  {last
                    ? `${last.speaker}: ${last.text}`
                    : _(msg`No messages yet`)}
                </Text>
              </View>
            </View>
            <ChevronRight size="sm" fill={t.atoms.text_contrast_low.color} />
          </View>
        )}
      </Link>
    </View>
  )
}
