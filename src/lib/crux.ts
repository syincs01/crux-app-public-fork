/**
 * The Crux bridge: the one process that compiles every post from this
 * network's firehose and serves what the platform cannot know (plan of
 * 5 September 2026, D1). Every call here is a READ. A person's writes travel
 * as records in their own repo (D3) and reach Crux through the firehose.
 */
import {useQuery} from '@tanstack/react-query'

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

/** The game (foundations §11): an invitation and the moves, records in the person's own repo (D3). */
export const INVITE_COLLECTION = 'app.crux.game.invite'
export const GAME_MOVE_COLLECTION = 'app.crux.game.move'
/** The record's question (§8; the game §3), answered by the person asked — `crux answer` as a record in their own repo. */
export const ANSWER_COLLECTION = 'app.crux.feed.answer'

export type StakeKind = 'contrary' | 'condition' | 'question'
export type GameMoveKind =
  'pass' | 'offer' | 'accept' | 'leave' | 'away' | 'continue'

export type Room = {
  id: string
  question: string
  root: {uri: string; did: string; speaker: string; text: string}
  messages: {
    uri: string
    did: string
    speaker: string
    text: string
    at: string
    move: string | null
    restsOn: {id: string; heading: string | null; url: string}[]
    /** What the record asked the author and they have not answered: the machine's own move, theirs to answer. */
    questions: {id: string; question: string; options: string[]}[]
  }[]
  folded: {uri: string; did: string; speaker: string; text: string}[]
  lastUri: string
}

/** Ruling 23 / §14.1 part 4: the chunk of shared knowledge nearest a claim, offered as what it rests on. */
export type NearChunk = {
  id: string
  heading: string
  subject: string
  url: string
  text: string
  by: string
  score: number
}
export function useNearChunk(
  text: string | undefined,
  handle: string | undefined,
) {
  return useQuery({
    queryKey: ['crux-chunk-near', text ?? '', handle ?? ''],
    enabled: !!text,
    staleTime: 5 * 60_000,
    queryFn: () =>
      cruxGet<{chunk: NearChunk | null}>(
        `/chunks/near?text=${encodeURIComponent(text!)}&handle=${encodeURIComponent(handle ?? '')}`,
      ),
  })
}

export type GameClaim = {
  /** The claim this one is the inference step of: shown under it, never beside it. */
  stepFor?: string
  id: string
  text: string
  by: string
  postUri: string
  standing: string
  word: string
  tone: 'holds' | 'fallen' | 'open' | 'quiet'
  holders: string[]
}
export type Owed = {
  by: string
  claimId: string
  claim: string
  what: string
  since: string
  defaulted: boolean
  /** Reasons the record already carries for this claim, given by somebody else: hold one to rest on it. */
  restOn: {id: string; text: string; by: string; postUri: string}[]
}
export type Ending =
  | {kind: 'open'}
  | {kind: 'offered'; by: string; at: string}
  | {kind: 'agreed'; blockId: string; at: string}
  | {kind: 'parted'; at: string}
  | {kind: 'unfinished'; by: string; at: string}

export type GameView = Room & {
  game: {
    players: {
      defender: {
        did: string
        handle: string
        stake: {kind: StakeKind; text: string} | null
      }
      challenger: {
        did: string
        handle: string
        stake: {kind: StakeKind; text: string} | null
      }
    }
    claim: string
    clockDays: number
    publicNotice: string
    owed: Owed[]
    toMove: string | null
    stores: Record<string, {asserted: GameClaim[]; letStand: GameClaim[]}>
    block: GameClaim[]
    canHold: GameClaim[]
    previews: {claimId: string; falls: {id: string; text: string}[]}[]
    ending: Ending
    offerLocked: boolean
  }
}

export type Games = {
  invites: {
    uri: string
    from: string
    subject: {uri: string; text: string}
    stake: {kind: StakeKind; text: string}
    clockDays: number
    at: string
  }[]
  games: {
    root: string
    question: string
    with: string
    ending: Ending
    url: string
  }[]
}

export function useGame(uri: string, viewer: string | undefined) {
  return useQuery({
    queryKey: ['crux-game', uri, viewer ?? ''],
    queryFn: () =>
      cruxGet<GameView>(
        `/game?uri=${encodeURIComponent(uri)}&viewer=${encodeURIComponent(viewer ?? '')}`,
      ),
    // ponytail: the game polls the bridge while open, as the room does.
    //   Ceiling: a move made while the tab is backgrounded waits 4 s to show.
    //   Upgrade: the bridge relays the firehose (a server-sent stream per game).
    refetchInterval: 4000,
  })
}

export function useGames(handle: string | undefined) {
  return useQuery({
    queryKey: ['crux-games', handle ?? ''],
    enabled: !!handle,
    queryFn: () =>
      cruxGet<Games>(`/games?handle=${encodeURIComponent(handle!)}`),
  })
}
