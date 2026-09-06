import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {INVITE_COLLECTION, type StakeKind} from '#/lib/crux'
import {usePdsClient, useSession} from '#/state/session'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {com} from '#/lexicons'

/**
 * The invitation to a game (the game page §1). It is a request, not a start:
 * the record lives in the challenger's own repo (D3), the person invited is
 * the only one who is shown it, and nothing is a game until they accept.
 * The stake is the challenger's own position — what they hold against this
 * post, or what would move them, or what they want to ask.
 */
export function GameInviteDialog({
  control,
  post,
}: {
  control: Dialog.DialogControlProps
  post: {uri: string; cid: string; authorDid: string; text: string}
}) {
  const {t: l} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={l`Invite to a game`}
        style={web({maxWidth: 500})}>
        <Inner control={control} post={post} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({
  control,
  post,
}: {
  control: Dialog.DialogControlProps
  post: {uri: string; cid: string; authorDid: string; text: string}
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const [kind, setKind] = useState<StakeKind>('contrary')
  const [text, setText] = useState('')
  const [days, setDays] = useState('7')
  const [sending, setSending] = useState(false)

  const options: {kind: StakeKind; label: string; placeholder: string}[] = [
    {
      kind: 'contrary',
      label: l`I hold the opposite`,
      placeholder: l`Say the opposite in one sentence`,
    },
    {
      kind: 'condition',
      label: l`It would take something to move me`,
      placeholder: l`What would move you?`,
    },
    {
      kind: 'question',
      label: l`I want to ask why`,
      placeholder: l`What do you want to ask?`,
    },
  ]
  const chosen = options.find(o => o.kind === kind)!
  const clockDays = Math.max(1, Math.round(Number(days) || 7))

  const send = async () => {
    if (!currentAccount || !text.trim() || sending) return
    setSending(true)
    try {
      await pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did,
        collection: INVITE_COLLECTION,
        record: {
          $type: INVITE_COLLECTION,
          subject: {uri: post.uri, cid: post.cid},
          to: post.authorDid,
          stake: {kind, text: text.trim()},
          clockDays,
          createdAt: new Date().toISOString(),
        },
      })
      control.close(() => Toast.show(l`Invitation sent — only they can see it`))
    } catch (e) {
      Toast.show((e as Error).message, {type: 'error'})
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={[a.gap_lg]}>
      <Text style={[a.text_xl, a.font_semi_bold]}>
        <Trans>Invite to a game</Trans>
      </Text>

      <View
        style={[
          a.rounded_sm,
          a.p_md,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg_contrast_25,
        ]}>
        <Text
          style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_high]}
          numberOfLines={6}>
          {post.text}
        </Text>
      </View>

      <View style={[a.gap_xs]}>
        <Text style={[a.text_md, a.font_semi_bold]}>
          <Trans>Where you stand</Trans>
        </Text>
        <Toggle.Group
          label={l`Where you stand`}
          type="radio"
          values={[kind]}
          onChange={v => setKind((v[0] as StakeKind) ?? 'contrary')}>
          <View>
            {options.map(o => (
              <Toggle.Item
                key={o.kind}
                highlightRow
                name={o.kind}
                label={o.label}>
                {({selected}) => (
                  <Toggle.RadioWithLabel label={o.label} selected={selected} />
                )}
              </Toggle.Item>
            ))}
          </View>
        </Toggle.Group>
      </View>

      <View style={[a.gap_xs]}>
        <TextField.LabelText nativeID="crux-stake-label">
          {chosen.placeholder}
        </TextField.LabelText>
        <TextField.Root>
          <Dialog.Input
            testID="cruxInviteStakeInput"
            value={text}
            onChangeText={setText}
            label={chosen.placeholder}
            accessibilityLabelledBy="crux-stake-label"
            multiline
          />
        </TextField.Root>
      </View>

      <View style={[a.gap_xs]}>
        <TextField.LabelText nativeID="crux-days-label">
          <Trans>Days to answer</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <Dialog.Input
            testID="cruxInviteDaysInput"
            value={days}
            onChangeText={setDays}
            label={l`Days to answer`}
            accessibilityLabelledBy="crux-days-label"
            keyboardType="number-pad"
          />
        </TextField.Root>
      </View>

      <Button
        testID="cruxInviteSendBtn"
        label={l`Send invitation`}
        size="large"
        color="primary"
        variant="solid"
        disabled={!text.trim() || sending}
        onPress={() => void send()}>
        <ButtonText>
          <Trans>Send invitation</Trans>
        </ButtonText>
        {sending ? <ButtonIcon icon={Loader} /> : null}
      </Button>
    </View>
  )
}
