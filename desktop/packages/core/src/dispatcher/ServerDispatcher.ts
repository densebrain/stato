/**
 * Copyright 2019-present Densebrain.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Copyright 2019-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import Server from "../server"
import { Store } from "../reducers/index"
import { Logger } from "../fb-interfaces/Logger"
import Client from "../Client"
import { UninitializedClient } from "../UninitializedClient"

export default async function(store: Store, logger: Logger) {
  const server = new Server(logger, store)
  server.init()
  server.addListener("new-client", (client: Client) => {
    store.dispatch({
      type: "NEW_CLIENT",
      payload: client
    }) // Wait 2 seconds, and then trigger another event so we can check it's displayed

    setTimeout(() => {
      store.dispatch({
        type: "NEW_CLIENT_SANITY_CHECK",
        payload: client
      })
    }, 2000)
  })
  server.addListener("removed-client", (id: string) => {
    store.dispatch({
      type: "CLIENT_REMOVED",
      payload: id
    })
    store.dispatch({
      type: "CLEAR_PLUGIN_STATE",
      payload: {
        id,
        devicePlugins: new Set([
          ...store.getState().plugins.devicePlugins.keys()
        ])
      }
    })
  })
  server.addListener("error", (err: any) => {
    const payload: string =
      err.code === "EADDRINUSE"
        ? "Couldn't start websocket server. Looks like you have multiple copies of Stato running."
        : err.message || "Unknown error"
    store.dispatch({
      type: "SERVER_ERROR",
      payload
    })
  })
  server.addListener("start-client-setup", (client: UninitializedClient) => {
    store.dispatch({
      type: "START_CLIENT_SETUP",
      payload: client
    })
  })
  server.addListener(
    "finish-client-setup",
    (payload: { client: UninitializedClient; deviceId: string }) => {
      store.dispatch({
        type: "FINISH_CLIENT_SETUP",
        payload: payload
      })
    }
  )
  server.addListener(
    "client-setup-error",
    (payload: { client: UninitializedClient; error: Error }) => {
      store.dispatch({
        type: "CLIENT_SETUP_ERROR",
        payload: payload
      })
    }
  )

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      server.close()
    })
  }
}