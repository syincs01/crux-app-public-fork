/**
 * The Crux bridge: the one process that compiles every post from this
 * network's firehose and serves what the platform cannot know (plan of
 * 5 September 2026, D1). Every call here is a READ. A person's writes travel
 * as records in their own repo (D3) and reach Crux through the firehose.
 */
export const CRUX_BRIDGE =
  process.env.EXPO_PUBLIC_CRUX_BRIDGE ?? 'http://localhost:8788'

export async function cruxGet<T>(path: string): Promise<T> {
  const r = await fetch(`${CRUX_BRIDGE}${path}`)
  if (!r.ok) throw new Error(`crux ${path}: ${r.status}`)
  return (await r.json()) as T
}

/** A8 ruling 1: agreement is a record in the person's own repo. */
export const AGREE_COLLECTION = 'app.crux.feed.agree'
/** A7 ruling 2: the person's own quiz answers, their §35 prior. */
export const WORLDVIEW_COLLECTION = 'app.crux.actor.worldview'

export type Axes = {econ: number; dipl: number; govt: number; scty: number}
export type WorldviewView = {
  fromAnswers: {axes: Axes; label: string} | null
  fromRecord: {
    axes: Axes
    label: string
    covered: number
    holds: number[]
    against: number[]
  } | null
  covered: number
  threshold: number
}
export type Statements = {
  axes: Record<keyof Axes, [string, string]>
  statements: {i: number; text: string}[]
}
