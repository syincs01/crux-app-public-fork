import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {AGREE_COLLECTION} from '#/lib/crux'
import {usePdsClient, useSession} from '#/state/session'
import {com} from '#/lexicons'

/**
 * Agreement (A8 ruling 1): "I hold this", a record in the person's own repo.
 * The button's state is read from that repo, not from the bridge; withdrawing
 * deletes the record (A8 ruling 7) and the record keeps both (§30).
 */
const KEY = ['crux-agree'] as const

/** subject post uri → the agree record's uri */
export function useMyAgreements() {
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  return useQuery({
    queryKey: KEY,
    enabled: !!currentAccount,
    staleTime: 60_000,
    queryFn: async () => {
      const out = new Map<string, string>()
      let cursor: string | undefined
      for (;;) {
        const r = await pdsClient.call(com.atproto.repo.listRecords, {
          repo: currentAccount!.did,
          collection: AGREE_COLLECTION,
          limit: 100,
          cursor,
        })
        for (const rec of r.records) {
          const subject = (rec.value as {subject?: {uri?: string}}).subject?.uri
          if (subject) out.set(subject, rec.uri)
        }
        // The PDS returns a cursor even on the last page.
        if (!r.cursor || r.records.length === 0) break
        cursor = r.cursor
      }
      return out
    },
  })
}

export function useAgreeMutation() {
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({uri, cid}: {uri: string; cid: string}) => {
      const r = await pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount!.did,
        collection: AGREE_COLLECTION,
        record: {
          $type: AGREE_COLLECTION,
          subject: {uri, cid},
          createdAt: new Date().toISOString(),
        },
      })
      return r.uri
    },
    onSuccess: (agreeUri, {uri}) =>
      qc.setQueryData<Map<string, string>>(KEY, m =>
        new Map(m ?? []).set(uri, agreeUri),
      ),
  })
}

export function useWithdrawAgreementMutation() {
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({agreeUri}: {subjectUri: string; agreeUri: string}) => {
      const rkey = agreeUri.split('/').pop()!
      await pdsClient.call(com.atproto.repo.deleteRecord, {
        repo: currentAccount!.did,
        collection: AGREE_COLLECTION,
        rkey,
      })
    },
    onSuccess: (_, {subjectUri}) =>
      qc.setQueryData<Map<string, string>>(KEY, m => {
        const n = new Map(m ?? [])
        n.delete(subjectUri)
        return n
      }),
  })
}
