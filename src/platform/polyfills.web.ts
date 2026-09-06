import 'array.prototype.findlast/auto'
import 'setimmediate'

if (process.env.NODE_ENV !== 'production') {
  // In development, react-native-web's <View> tries to validate that
  // text is wrapped into <Text>. It doesn't catch all cases but is useful.
  // Unfortunately, it only does that via console.error so it's easy to miss.
  // This is a hack to get it showing as a redbox on the web so we catch it early.
  const realConsoleError = console.error
  const thrownErrors = new WeakSet()
  console.error = function consoleErrorWrapper(msgOrError) {
    if (
      typeof msgOrError === 'string' &&
      msgOrError.startsWith('Unexpected text node')
    ) {
      if (
        msgOrError ===
        'Unexpected text node: . A text node cannot be a child of a <View>.'
      ) {
        // This is due to a stray empty string.
        // React already handles this fine, so RNW warning is a false positive. Ignore.
        return
      }
      const err = new Error(msgOrError)
      thrownErrors.add(err)
      throw err
    } else if (!thrownErrors.has(msgOrError)) {
      // @ts-expect-error
      return realConsoleError.apply(this, arguments)
    }
  }
}

export {}

// ponytail (crux spike): the dev-env names every service as localhost — the
// PDS in each DID document (:2583), the AppView (:2584), the bridge (:8788) —
// and a browser on any other machine cannot reach those. When the page is
// served from somewhere else (a LAN address, a tunnel), every such URL is
// rewritten to the page's own origin, where the dev server proxies /xrpc and
// /bridge (webpack.config.js). One translation point, inert on localhost.
//   Ceiling: only fetch — an <img> the AppView names absolute stays broken;
//     a WebSocket would too.
//   Upgrade: dev-env DID documents and image URLs that name the public origin.
if (
  typeof window !== 'undefined' &&
  !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
) {
  const origin = window.location.origin
  const rewrite = (u: string) =>
    u
      .replace(/^http:\/\/localhost:258[34]\//, `${origin}/`)
      .replace(/^http:\/\/localhost:8788\//, `${origin}/bridge/`)
  const realFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') return realFetch(rewrite(input), init)
    if (input instanceof URL) return realFetch(rewrite(input.href), init)
    const url = rewrite(input.url)
    return realFetch(url === input.url ? input : new Request(url, input), init)
  }
}
