/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import CrashReporterPlugin, {
  Crash,
  CrashReporterPersistedState, getNewPersistedStateFromCrashLog,
  parseCrashLog,
  parsePath,
  shouldShowCrashNotification
} from "../index"
import {BaseDevice, getPersistedState, getPluginKey} from "@stato/core"
import {stato as Models} from "@stato/models"

function setDefaultPersistedState(defaultState: CrashReporterPersistedState) {
  CrashReporterPlugin.componentClazz.defaultPersistedState = defaultState
}

function setNotificationID(notificationID: number) {
  CrashReporterPlugin.componentClazz.notificationID = notificationID
}

function setCrashReporterPluginID(id: string) {
  CrashReporterPlugin.id = id
}

function getCrash(id: number, callstack: string, name: string, reason: string): Crash {
  return {
    notificationID: id.toString(),
    callstack: callstack,
    reason: reason,
    name: name,
    date: new Date()
  }
}

function assertCrash(crash: Crash, expectedCrash: Crash) {
  const { notificationID, callstack, reason, name, date } = crash
  expect(notificationID).toEqual(expectedCrash.notificationID)
  expect(callstack).toEqual(expectedCrash.callstack)
  expect(reason).toEqual(expectedCrash.reason)
  expect(name).toEqual(expectedCrash.name)
  expect(date.toDateString()).toEqual(expectedCrash.date.toDateString())
}

beforeEach(() => {
  setNotificationID(0) // Resets notificationID to 0

  setDefaultPersistedState({
    crashes: []
  }) // Resets defaultpersistedstate

  setCrashReporterPluginID("CrashReporter")
})
afterAll(() => {
  // Reset values
  setNotificationID(0)
  setDefaultPersistedState({
    crashes: []
  })
  setCrashReporterPluginID("")
})
test("test the parsing of the date and crash info for the log which matches the predefined regex", () => {
  const log =
    "Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa Date/Time: 2019-03-21 12:07:00.861 +0000 \n Blaa balaaa"
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("SIGSEGV")
  expect(crash.name).toEqual("SIGSEGV")
  expect(crash.date).toEqual(new Date("2019-03-21 12:07:00.861"))
})
test("test the parsing of the reason for crash when log matches the crash regex, but there is no mention of date", () => {
  const log = "Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa"
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("SIGSEGV")
  expect(crash.name).toEqual("SIGSEGV")
  expect(crash.date).toBeUndefined()
})
test("test the parsing of the crash log when log does not match the predefined regex but is alphanumeric", () => {
  const log = "Blaa Blaaa \n Blaa Blaaa \n Blaa Blaaa"
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("Cannot figure out the cause")
})
test("test the parsing of the reason for crash when log does not match the predefined regex contains unicode character", () => {
  const log = "Blaa Blaaa \n Blaa Blaaa \n Exception Type:  🍕🐬 \n Blaa Blaa \n Blaa Blaa"
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("Cannot figure out the cause")
  expect(crash.date).toBeUndefined()
})
test("test the parsing of the reason for crash when log is empty", () => {
  const log = ""
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("Cannot figure out the cause")
  expect(crash.date).toBeUndefined()
})
test("test the parsing of the Android crash log for the proper android crash format", () => {
  const log =
    "FATAL EXCEPTION: main\nProcess: com.facebook.states.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.states.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.states.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n"
  const date = new Date()
  const crash = parseCrashLog(log, Models.OS.OSAndroid, date)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("java.lang.IndexOutOfBoundsException: Index: 190, Size: 0")
  expect(crash.name).toEqual("FATAL EXCEPTION: main")
  expect(crash.date).toEqual(date)
})
test("test the parsing of the Android crash log for the unknown crash format and no date", () => {
  const log = "Blaa Blaa Blaa"
  const crash = parseCrashLog(log, Models.OS.OSAndroid)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("Cannot figure out the cause")
  expect(crash.date).toBeUndefined()
})
test("test the parsing of the Android crash log for the partial format matching the crash format", () => {
  const log = "First Line Break \n Blaa Blaa \n Blaa Blaa "
  const crash = parseCrashLog(log, Models.OS.OSAndroid)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("First Line Break ")
})
test("test the parsing of the Android crash log with os being iOS", () => {
  const log =
    "FATAL EXCEPTION: main\nProcess: com.facebook.states.sample, PID: 27026\njava.lang.IndexOutOfBoundsException: Index: 190, Size: 0\n\tat java.util.ArrayList.get(ArrayList.java:437)\n\tat com.facebook.states.sample.RootComponentSpec.hitGetRequest(RootComponentSpec.java:72)\n\tat com.facebook.states.sample.RootComponent.hitGetRequest(RootComponent.java:46)\n"
  const crash = parseCrashLog(log, Models.OS.OSIOS)
  expect(crash.callstack).toEqual(log)
  expect(crash.reason).toEqual("Cannot figure out the cause")
  expect(crash.name).toEqual("Cannot figure out the cause")
})
test("test the getter of pluginKey with proper input", () => {
  const device = new BaseDevice(Models.OS.OSAndroid,"serial", "emulator", "test device")
  const pluginKey = getPluginKey(null, device, "CrashReporter")
  expect(pluginKey).toEqual("serial#CrashReporter")
})
test("test the getter of pluginKey with undefined input", () => {
  const pluginKey = getPluginKey(null, undefined, "CrashReporter")
  expect(pluginKey).toEqual("unknown#CrashReporter")
})
test("test the getter of pluginKey with defined selected app", () => {
  const pluginKey = getPluginKey("selectedApp", undefined, "CrashReporter")
  expect(pluginKey).toEqual("selectedApp#CrashReporter")
})
test("test the getter of pluginKey with defined selected app and defined base device", () => {
  const device = new BaseDevice(Models.OS.OSAndroid,"serial", "emulator", "test device")
  const pluginKey = getPluginKey("selectedApp", device, "CrashReporter")
  expect(pluginKey).toEqual("selectedApp#CrashReporter")
})
test("test defaultPersistedState of CrashReporterPlugin", () => {
  expect(CrashReporterPlugin.componentClazz.defaultPersistedState).toEqual({
    crashes: []
  })
})
test("test helper setdefaultPersistedState function", () => {
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  setDefaultPersistedState({
    crashes: [crash]
  })
  expect(CrashReporterPlugin.componentClazz.defaultPersistedState).toEqual({
    crashes: [crash]
  })
})
test("test getPersistedState for non-empty defaultPersistedState and undefined pluginState", () => {
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStates = {}
  const perisistedState = getPersistedState(
    getPluginKey(null, null, CrashReporterPlugin.id),
    CrashReporterPlugin,
    pluginStates
  )
  expect(perisistedState).toEqual({
    crashes: [crash]
  })
})
test("test getPersistedState for non-empty defaultPersistedState and defined pluginState", () => {
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  const pluginKey = getPluginKey(null, null, CrashReporterPlugin.id)
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStateCrash = getCrash(1, "callstack", "crash1", "crash1")
  const pluginStates = {
    "unknown#CrashReporter": {
      crashes: [pluginStateCrash]
    }
  }
  const perisistedState = getPersistedState(pluginKey, CrashReporterPlugin, pluginStates)
  expect(perisistedState).toEqual({
    crashes: [pluginStateCrash]
  })
})
test("test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState", () => {
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  const pluginKey = getPluginKey(null, null, CrashReporterPlugin.id)
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStateCrash = getCrash(1, "callstack", "crash1", "crash1")
  const pluginStates = {
    "unknown#CrashReporter": {
      crashes: [pluginStateCrash]
    }
  }
  const perisistedState = getPersistedState(pluginKey, CrashReporterPlugin, pluginStates)
  const content = "Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV \n Blaa Blaa \n Blaa Blaa"
  expect(perisistedState).toBeDefined() // $FlowFixMe: Checked if perisistedState is defined or not

  const { crashes } = perisistedState
  expect(crashes).toBeDefined()
  expect(crashes.length).toEqual(1)
  expect(crashes[0]).toEqual(pluginStateCrash)
  const newPersistedState = getNewPersistedStateFromCrashLog(perisistedState, CrashReporterPlugin, content, Models.OS.OSIOS)
  expect(newPersistedState).toBeDefined() // $FlowFixMe: Checked if perisistedState is defined or not

  const newPersistedStateCrashes = newPersistedState.crashes
  expect(newPersistedStateCrashes).toBeDefined()
  expect(newPersistedStateCrashes.length).toEqual(2)
  assertCrash(newPersistedStateCrashes[0], pluginStateCrash)
  assertCrash(newPersistedStateCrashes[1], getCrash(1, content, "SIGSEGV", "SIGSEGV"))
})
test("test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and undefined pluginState", () => {
  setNotificationID(0)
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  const pluginKey = getPluginKey(null, null, CrashReporterPlugin.id)
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStates = {}
  const perisistedState = getPersistedState(pluginKey, CrashReporterPlugin, pluginStates)
  const content = "Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV"
  expect(perisistedState).toEqual({
    crashes: [crash]
  })
  const newPersistedState = getNewPersistedStateFromCrashLog(perisistedState, CrashReporterPlugin, content, Models.OS.OSIOS)
  expect(newPersistedState).toBeDefined() // $FlowFixMe: Checked if perisistedState is defined or not

  const { crashes } = newPersistedState
  expect(crashes).toBeDefined()
  expect(crashes.length).toEqual(2)
  assertCrash(crashes[0], crash)
  assertCrash(crashes[1], getCrash(1, content, "SIGSEGV", "SIGSEGV"))
})
test("test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState and improper crash log", () => {
  setNotificationID(0)
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  const pluginKey = getPluginKey(null, null, CrashReporterPlugin.id)
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStateCrash = getCrash(1, "callstack", "crash1", "crash1")
  const pluginStates = {
    "unknown#CrashReporter": {
      crashes: [pluginStateCrash]
    }
  }
  const perisistedState = getPersistedState(pluginKey, CrashReporterPlugin, pluginStates)
  const content = "Blaa Blaaa \n Blaa Blaaa"
  expect(perisistedState).toEqual({
    crashes: [pluginStateCrash]
  })
  const newPersistedState = getNewPersistedStateFromCrashLog(perisistedState, CrashReporterPlugin, content, Models.OS.OSIOS)
  expect(newPersistedState).toBeDefined() // $FlowFixMe: Checked if perisistedState is defined or not

  const { crashes } = newPersistedState
  expect(crashes).toBeDefined()
  expect(crashes.length).toEqual(2)
  assertCrash(crashes[0], pluginStateCrash)
  assertCrash(crashes[1], getCrash(1, content, "Cannot figure out the cause", "Cannot figure out the cause"))
})
test("test getNewPersisitedStateFromCrashLog when os is undefined", () => {
  setNotificationID(0)
  const crash = getCrash(0, "callstack", "crash0", "crash0")
  const pluginKey = getPluginKey(null, null, CrashReporterPlugin.id)
  setDefaultPersistedState({
    crashes: [crash]
  })
  const pluginStateCrash = getCrash(1, "callstack", "crash1", "crash1")
  const pluginStates = {
    "unknown#CrashReporter": {
      crashes: [pluginStateCrash]
    }
  }
  const perisistedState = getPersistedState(pluginKey, CrashReporterPlugin, pluginStates)
  const content = "Blaa Blaaa \n Blaa Blaaa"
  const newPersistedState = getNewPersistedStateFromCrashLog(perisistedState, CrashReporterPlugin, content)
  expect(newPersistedState).toEqual(null)
})
test("test parsing of path when inputs are correct", () => {
  const content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName \n Blaa Blaa \n Blaa Blaa"
  const id = parsePath(content)
  expect(id).toEqual("path/to/simulator/TH1S-15DEV1CE-1D/AppName.app/AppName")
})
test("test parsing of path when path has special characters in it", () => {
  let content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa"
  let id = parsePath(content)
  expect(id).toEqual("path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name")
  content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name \n Blaa Blaa \n Blaa Blaa"
  id = parsePath(content)
  expect(id).toEqual("path/to/simulator/TH1S-15DEV1CE-1D/App_Name.app/App_Name")
  content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name \n Blaa Blaa \n Blaa Blaa"
  id = parsePath(content)
  expect(id).toEqual("path/to/simulator/TH1S-15DEV1CE-1D/App%20Name.app/App%20Name")
})
test("test parsing of path when a regex is not present", () => {
  const content = "Blaa Blaaa \n Blaa Blaaa \n Blaa Blaa \n Blaa Blaa"
  const id = parsePath(content)
  expect(id).toEqual(null)
})
test("test shouldShowCrashNotification function for all correct inputs", () => {
  const device = new BaseDevice(Models.OS.OSAndroid,"TH1S-15DEV1CE-1D", "emulator", "test device")
  let content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-15DEV1CE-1D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa"
  const shouldShowNotification = shouldShowCrashNotification(device, content)
  expect(shouldShowNotification).toEqual(true)
})
test("test shouldShowCrashNotification function for all correct inputs but incorrect id", () => {
  const device = new BaseDevice(Models.OS.OSAndroid,"TH1S-15DEV1CE-1D", "emulator", "test device")
  let content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa"
  const shouldShowNotification = shouldShowCrashNotification(device, content)
  expect(shouldShowNotification).toEqual(false)
})
test("test shouldShowCrashNotification function for undefined device", () => {
  let content =
    "Blaa Blaaa \n Blaa Blaaa \n Path:  path/to/simulator/TH1S-1598DEV1CE-2D/App Name.app/App Name \n Blaa Blaa \n Blaa Blaa"
  const shouldShowNotification = shouldShowCrashNotification(null, content)
  expect(shouldShowNotification).toEqual(false)
})
