/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import { init as initLogger } from "../fb-stubs/Logger"
import Server from "../server"
import reducers, {Store} from "../reducers/index"
//import configureStore from "redux-mock-store"
import * as path from "path"
import * as os from "os"
import * as fs from "fs"

const configureStore = require("redux-mock-store").default

let server: Server | null = null

const mockStore = configureStore([])(
  reducers(undefined, {
    type: "INIT"
  })
) as Store

beforeAll(() => {
  // create config directory, which is usually created by static/index.js
  const statoDir = path.join(os.homedir(), ".stato")

  if (!fs.existsSync(statoDir)) {
    fs.mkdirSync(statoDir)
  }

  const logger = initLogger(mockStore)
  server = new Server(logger, mockStore)
})
test("servers starting at ports", done => {
  const ports = mockStore.getState().application.serverPorts
  const serversToBeStarted = new Set([ports.secure, ports.insecure]) // Resolve promise when we get a listen event for each port

  const listenerPromise = new Promise((resolve, _reject) => {
    server.addListener("listening", port => {
      if (!serversToBeStarted.has(port)) {
        throw Error(`unknown server started at port ${port}`)
      } else {
        serversToBeStarted.delete(port)
      }

      if (serversToBeStarted.size === 0) {
        done()
        resolve()
      }
    })
  }) // Initialise server after the listeners have been setup

  server.init()
  return listenerPromise
})
afterAll(() => {
  return server.close()
})
