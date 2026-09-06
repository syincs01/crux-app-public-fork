import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {useRequireAuth, useSession} from '#/state/session'
import {EventStopper} from '#/view/com/util/EventStopper'
import {useTheme} from '#/alf'
import {CloseQuote_Stroke2_Corner1_Rounded as Quote} from '#/components/icons/Quote'
import {Repost_Stroke2_Corner2_Rounded as Repost} from '#/components/icons/Repost'
import * as Menu from '#/components/Menu'
import {
  PostControlButton,
  PostControlButtonIcon,
  PostControlButtonText,
} from './PostControlButton'
import {useFormatPostStatCount} from './util'

/**
 * A8 ruling 1: a repost is agreement, so the menu is Agree · Agree and
 * repost · Quote with a reason. There is no repost that is not an agreement,
 * and agreement is taken back from the same button (A8 ruling 7).
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

export const RepostButton = ({
  isAgreed,
  isReposted,
  repostCount,
  onAgree,
  onAgreeAndRepost,
  onWithdraw,
  onQuote,
  big,
  embeddingDisabled,
}: Props) => {
  const t = useTheme()
  const {_} = useLingui()
  const {hasSession} = useSession()
  const requireAuth = useRequireAuth()
  const formatPostStatCount = useFormatPostStatCount()
  const active = isAgreed || isReposted

  return hasSession ? (
    <EventStopper onKeyDown={false}>
      <Menu.Root>
        <Menu.Trigger label={_(msg`Agree, repost or quote`)}>
          {({props}) => {
            return (
              <PostControlButton
                testID="repostBtn"
                active={active}
                activeColor={t.palette.positive_500}
                label={props.accessibilityLabel}
                big={big}
                {...props}>
                <PostControlButtonIcon icon={Repost} />
                {typeof repostCount !== 'undefined' && repostCount > 0 && (
                  <PostControlButtonText testID="repostCount">
                    {formatPostStatCount(repostCount)}
                  </PostControlButtonText>
                )}
              </PostControlButton>
            )
          }}
        </Menu.Trigger>
        <Menu.Outer style={{minWidth: 200}}>
          {isAgreed ? (
            <Menu.Item
              label={_(msg`Withdraw agreement`)}
              testID="repostDropdownWithdrawBtn"
              onPress={onWithdraw}>
              <Menu.ItemText>{_(msg`Withdraw agreement`)}</Menu.ItemText>
              <Menu.ItemIcon icon={Repost} position="right" />
            </Menu.Item>
          ) : (
            <>
              <Menu.Item
                label={_(msg`Agree`)}
                testID="repostDropdownAgreeBtn"
                onPress={onAgree}>
                <Menu.ItemText>{_(msg`Agree`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Repost} position="right" />
              </Menu.Item>
              <Menu.Item
                label={_(msg`Agree and repost`)}
                testID="repostDropdownRepostBtn"
                onPress={onAgreeAndRepost}>
                <Menu.ItemText>{_(msg`Agree and repost`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Repost} position="right" />
              </Menu.Item>
            </>
          )}
          <Menu.Item
            disabled={embeddingDisabled}
            label={
              embeddingDisabled
                ? _(msg`Quote posts disabled`)
                : _(msg`Quote with a reason`)
            }
            testID="repostDropdownQuoteBtn"
            onPress={onQuote}>
            <Menu.ItemText>
              {embeddingDisabled
                ? _(msg`Quote posts disabled`)
                : _(msg`Quote with a reason`)}
            </Menu.ItemText>
            <Menu.ItemIcon icon={Quote} position="right" />
          </Menu.Item>
        </Menu.Outer>
      </Menu.Root>
    </EventStopper>
  ) : (
    <PostControlButton
      onPress={() => requireAuth(() => {})}
      active={active}
      activeColor={t.palette.positive_500}
      label={_(msg`Agree, repost or quote`)}
      big={big}>
      <PostControlButtonIcon icon={Repost} />
      {typeof repostCount !== 'undefined' && repostCount > 0 && (
        <PostControlButtonText testID="repostCount">
          {formatPostStatCount(repostCount)}
        </PostControlButtonText>
      )}
    </PostControlButton>
  )
}
