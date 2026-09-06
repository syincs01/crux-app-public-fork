import {memo, useCallback} from 'react'
import {View} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useHaptics} from '#/lib/haptics'
import {useRequireAuth} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {CloseQuote_Stroke2_Corner1_Rounded as QuoteIcon} from '#/components/icons/Quote'
import {Repost_Stroke2_Corner3_Rounded as RepostIcon} from '#/components/icons/Repost'
import {useFormatPostStatCount} from '#/components/PostControls/util'
import {Text} from '#/components/Typography'
import {
  PostControlButton,
  PostControlButtonIcon,
  PostControlButtonText,
} from './PostControlButton'

/**
 * A8 ruling 1: a repost is agreement, so the sheet is Agree · Agree and
 * repost · Quote with a reason; agreement is taken back from the same button
 * (A8 ruling 7). There is no repost that is not an agreement.
 */
interface Props {
  isAgreed: boolean
  isReposted: boolean
  repostCount?: number
  onAgree: () => void
  onAgreeAndRepost: () => void
  onWithdraw: () => void
  onQuote: () => void
  big?: boolean
  embeddingDisabled: boolean
}

let RepostButton = ({
  isAgreed,
  isReposted,
  repostCount,
  onAgree,
  onAgreeAndRepost,
  onWithdraw,
  onQuote,
  big,
  embeddingDisabled,
}: Props): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const requireAuth = useRequireAuth()
  const dialogControl = Dialog.useDialogControl()
  const formatPostStatCount = useFormatPostStatCount()

  const onPress = () => requireAuth(() => dialogControl.open())

  const onLongPress = () =>
    requireAuth(() => {
      if (embeddingDisabled) {
        dialogControl.open()
      } else {
        onQuote()
      }
    })

  return (
    <>
      <PostControlButton
        testID="repostBtn"
        active={isAgreed || isReposted}
        activeColor={t.palette.positive_500}
        big={big}
        onPress={onPress}
        onLongPress={onLongPress}
        label={
          isAgreed
            ? _(
                msg({
                  message: `Withdraw agreement (${plural(repostCount || 0, {
                    one: '# repost',
                    other: '# reposts',
                  })})`,
                  comment:
                    'Accessibility label for the agree button when the person has agreed, verb followed by number of reposts and noun',
                }),
              )
            : _(
                msg({
                  message: `Agree, repost or quote (${plural(repostCount || 0, {
                    one: '# repost',
                    other: '# reposts',
                  })})`,
                  comment:
                    'Accessibility label for the agree button when the person has not agreed, verb form followed by number of reposts and noun form',
                }),
              )
        }>
        <PostControlButtonIcon icon={RepostIcon} />
        {typeof repostCount !== 'undefined' && repostCount > 0 && (
          <PostControlButtonText testID="repostCount">
            {formatPostStatCount(repostCount)}
          </PostControlButtonText>
        )}
      </PostControlButton>
      <Dialog.Outer
        control={dialogControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <RepostButtonDialogInner
          isAgreed={isAgreed}
          onAgree={onAgree}
          onAgreeAndRepost={onAgreeAndRepost}
          onWithdraw={onWithdraw}
          onQuote={onQuote}
          embeddingDisabled={embeddingDisabled}
        />
      </Dialog.Outer>
    </>
  )
}
RepostButton = memo(RepostButton)
export {RepostButton}

let RepostButtonDialogInner = ({
  isAgreed,
  onAgree,
  onAgreeAndRepost,
  onWithdraw,
  onQuote,
  embeddingDisabled,
}: {
  isAgreed: boolean
  onAgree: () => void
  onAgreeAndRepost: () => void
  onWithdraw: () => void
  onQuote: () => void
  embeddingDisabled: boolean
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const playHaptic = useHaptics()
  const control = Dialog.useDialogContext()

  const closeThen = useCallback(
    (fn: () => void, haptic = true) => {
      if (haptic) playHaptic()
      control.close(() => fn())
    },
    [control, playHaptic],
  )

  const onPressClose = useCallback(() => control.close(), [control])

  const item = (
    label: string,
    onPress: () => void,
    Icon: typeof RepostIcon,
    testID?: string,
    disabled = false,
  ) => (
    <Button
      key={label}
      disabled={disabled}
      testID={testID}
      style={[a.justify_start, a.px_md, a.gap_sm]}
      label={label}
      onPress={onPress}
      size="large"
      variant="ghost"
      color="primary">
      <Icon
        size="lg"
        fill={
          disabled ? t.atoms.text_contrast_low.color : t.palette.primary_500
        }
      />
      <Text
        style={[
          a.font_semi_bold,
          a.text_xl,
          disabled && t.atoms.text_contrast_low,
        ]}>
        {label}
      </Text>
    </Button>
  )

  return (
    <Dialog.ScrollableInner label={_(msg`Agree, repost or quote`)}>
      <View style={a.gap_xl}>
        <View style={a.gap_xs}>
          {isAgreed
            ? item(
                _(msg`Withdraw agreement`),
                () => closeThen(onWithdraw, false),
                RepostIcon,
                'withdrawBtn',
              )
            : [
                item(
                  _(msg`Agree`),
                  () => closeThen(onAgree),
                  RepostIcon,
                  'agreeBtn',
                ),
                item(
                  _(msg`Agree and repost`),
                  () => closeThen(onAgreeAndRepost),
                  RepostIcon,
                  'repostBtn',
                ),
              ]}
          {item(
            embeddingDisabled
              ? _(msg`Quote posts disabled`)
              : _(msg`Quote with a reason`),
            () => closeThen(onQuote),
            QuoteIcon,
            'quoteBtn',
            embeddingDisabled,
          )}
        </View>
        <Button
          label={_(msg`Cancel`)}
          onPress={onPressClose}
          size="large"
          color="secondary">
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
      </View>
    </Dialog.ScrollableInner>
  )
}
RepostButtonDialogInner = memo(RepostButtonDialogInner)
export {RepostButtonDialogInner}
