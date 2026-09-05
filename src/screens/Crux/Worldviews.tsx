import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type Axes,
  cruxGet,
  type Statements,
  WORLDVIEW_COLLECTION,
  type WorldviewView,
} from '#/lib/crux'
import {usePdsClient, useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {putRecord} from '#/lexicons/com/atproto/repo'

/**
 * Worldviews (A7 ruling 2). Two cards from one formula: the person's own
 * answers (§35's prior, "not evidence"), and what the record says they hold.
 * The page says which is which, and says "not enough said yet" rather than
 * calling an empty record a centrist.
 */
export function WorldviewsScreen() {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const handle = currentAccount?.handle ?? ''
  const view = useQuery({
    queryKey: ['crux-worldview', handle],
    enabled: !!handle,
    queryFn: () =>
      cruxGet<WorldviewView>(`/worldview?handle=${encodeURIComponent(handle)}`),
  })
  const statements = useQuery({
    queryKey: ['crux-worldview-statements'],
    queryFn: () => cruxGet<Statements>('/worldview/statements'),
  })

  return (
    <Layout.Screen testID="cruxWorldviewsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Worldviews</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.px_lg, a.py_lg, a.gap_xl]}>
          <Card title={_(msg`From your answers`)}>
            {view.data?.fromAnswers ? (
              <Label
                axes={view.data.fromAnswers.axes}
                label={view.data.fromAnswers.label}
                ends={statements.data?.axes}
              />
            ) : statements.data ? (
              <Quiz statements={statements.data} />
            ) : statements.error || view.error ? (
              <Text style={[a.text_sm]} testID="cruxWorldviewError">
                <Trans>Crux is not answering:</Trans>{' '}
                {String((statements.error ?? view.error)?.message)}
              </Text>
            ) : (
              <Text style={[a.text_sm]}>
                <Trans>Loading…</Trans>
              </Text>
            )}
          </Card>
          <Card title={_(msg`From what you've said`)}>
            {view.data?.fromRecord ? (
              <>
                <Label
                  axes={view.data.fromRecord.axes}
                  label={view.data.fromRecord.label}
                  ends={statements.data?.axes}
                />
                <Covered view={view.data} statements={statements.data} />
              </>
            ) : (
              <Text style={[a.text_sm, a.leading_snug]}>
                <Trans>
                  Not enough said yet — this fills in from the claims you hold.
                </Trans>
                {view.data
                  ? ` (${view.data.covered} of ${view.data.threshold})`
                  : ''}
              </Text>
            )}
          </Card>
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function Card({title, children}: {title: string; children: React.ReactNode}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.p_lg,
        a.gap_md,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.text_lg, a.font_bold]}>{title}</Text>
      {children}
    </View>
  )
}

const AXIS_KEYS: (keyof Axes)[] = ['econ', 'dipl', 'govt', 'scty']

function Label({
  axes,
  label,
  ends,
}: {
  axes: Axes
  label: string
  ends: Record<keyof Axes, [string, string]> | undefined
}) {
  const t = useTheme()
  return (
    <View style={[a.gap_md]}>
      <Text style={[a.text_2xl, a.font_bold]} testID="cruxWorldviewLabel">
        {label}
      </Text>
      {AXIS_KEYS.map(k => {
        const [left, right] = ends?.[k] ?? [k, k]
        const pct = axes[k]
        return (
          <View key={k} style={[a.gap_xs]}>
            <View style={[a.flex_row, a.justify_between]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {left}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {right}
              </Text>
            </View>
            <View
              style={[
                a.flex_row,
                a.w_full,
                {height: 8},
                a.rounded_full,
                t.atoms.bg_contrast_50,
              ]}>
              <View
                style={[
                  {width: `${pct}%`, height: 8},
                  a.rounded_full,
                  {backgroundColor: t.palette.primary_500},
                ]}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Under the record's label: the statements it reached, and which way (A7 ruling 2: a label opens onto its claims). */
function Covered({
  view,
  statements,
}: {
  view: WorldviewView
  statements: Statements | undefined
}) {
  const t = useTheme()
  if (!view.fromRecord || !statements) return null
  const text = (i: number) => statements.statements[i]?.text ?? ''
  return (
    <View style={[a.gap_xs, a.pt_sm]}>
      {view.fromRecord.holds.map(i => (
        <Text key={`h${i}`} style={[a.text_sm]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>you hold this:</Trans>
          </Text>{' '}
          {text(i)}
        </Text>
      ))}
      {view.fromRecord.against.map(i => (
        <Text key={`a${i}`} style={[a.text_sm]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>you hold the contrary:</Trans>
          </Text>{' '}
          {text(i)}
        </Text>
      ))}
    </View>
  )
}

const CHOICES: {value: number; label: string}[] = [
  {value: -1, label: 'Strongly disagree'},
  {value: -0.5, label: 'Disagree'},
  {value: 0, label: 'Neutral'},
  {value: 0.5, label: 'Agree'},
  {value: 1, label: 'Strongly agree'},
]

/** The 70 statements, one at a time. Finishing writes the record to the person's own repo (D3). */
function Quiz({statements}: {statements: Statements}) {
  const {_} = useLingui()
  const t = useTheme()
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const qc = useQueryClient()
  const [answers, setAnswers] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const i = answers.length
  const total = statements.statements.length
  const current = useMemo(() => statements.statements[i], [statements, i])

  const finish = async (all: number[]) => {
    if (!currentAccount) return
    setSaving(true)
    setError(null)
    try {
      await pdsClient.call(putRecord, {
        repo: currentAccount.did,
        collection: WORLDVIEW_COLLECTION,
        rkey: 'self',
        record: {
          $type: WORLDVIEW_COLLECTION,
          answers: all,
          createdAt: new Date().toISOString(),
        },
      })
      // The bridge learns of the record from the firehose; give it a moment, then re-read.
      setTimeout(
        () => void qc.invalidateQueries({queryKey: ['crux-worldview']}),
        2500,
      )
      setTimeout(
        () => void qc.invalidateQueries({queryKey: ['crux-worldview']}),
        8000,
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const answer = (v: number) => {
    const next = [...answers, v]
    setAnswers(next)
    if (next.length >= total) void finish(next)
  }

  if (!current) {
    return (
      <Text style={[a.text_sm]}>
        {saving
          ? _(msg`Saving your answers…`)
          : error
            ? error
            : _(msg`Reading your answers…`)}
      </Text>
    )
  }
  return (
    <View style={[a.gap_md]} testID="cruxWorldviewQuiz">
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {i + 1} / {total}
      </Text>
      <Text style={[a.text_md, a.leading_snug]} testID="cruxWorldviewStatement">
        {current.text}
      </Text>
      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {CHOICES.map(c => (
          <Button
            key={c.value}
            label={c.label}
            testID={`cruxWorldviewChoice-${c.label.replace(/\s/g, '')}`}
            size="small"
            color={c.value === 0 ? 'secondary' : 'primary_subtle'}
            onPress={() => answer(c.value)}>
            <ButtonText>{c.label}</ButtonText>
          </Button>
        ))}
      </View>
    </View>
  )
}
