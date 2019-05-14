/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import * as Electron from 'electron';
import { remote, ipcRenderer } from 'electron';
import { Store } from '../reducers/index';
import {getLogger, Logger} from '../fb-interfaces/Logger'
import { toggleAction } from '../reducers/application';
import { parseFlipperPorts } from '../utils/environmentVariables';
import { importDataToStore, importFileToStore, IMPORT_FLIPPER_TRACE_EVENT } from '../utils/exportData';
import { tryCatchReportPlatformFailures } from '../utils/metrics';
import { selectPlugin } from '../reducers/connections';
import qs from 'query-string';
import {oc} from "ts-optchain"

const log = getLogger(__filename)

export const uriComponents = (url: string) => {
  if (!url) {
    return [];
  }

  const match: Array<string> | null | undefined = url.match(/^flipper:\/\/([^\/]*)\/([^\/]*)\/?(.*)$/);

  if (match) {
    return (match.map(decodeURIComponent).slice(1).filter(Boolean) as Array<string>);
  }

  return [];
};
export default ((store: Store, _logger: Logger) => {
  const currentWindow = remote.getCurrentWindow();
  currentWindow.on('focus', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: true
    });
  });
  currentWindow.on('blur', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: false
    });
  });
  ipcRenderer.on('flipper-protocol-handler', async (_event:Electron.Event, url:string) => {
    if (url.startsWith('flipper://import')) {
      const {
        search
      } = new URL(url);
      
      const download = oc(qs.parse(search)).url(null);
      if (!download) return
      
      store.dispatch(toggleAction('downloadingImportData', true));
      
      const
        res = await fetch(String(download)),
        data = await res.text()
      
      try {
        await importDataToStore(data, store)
        store.dispatch(toggleAction('downloadingImportData', false))
      } catch (err) {
        log.error(err);
        store.dispatch(toggleAction('downloadingImportData', false));
      }
      return null
    }

    const match = uriComponents(url);

    if (match.length > 1) {
      // flipper://<client>/<pluginId>/<payload>
      return store.dispatch(selectPlugin({
        selectedApp: match[0],
        selectedPlugin: match[1],
        deepLinkPayload: match[2]
      }));
    }
  });
  ipcRenderer.on('open-flipper-file', (_event: Electron.Event, url: string) => {
    tryCatchReportPlatformFailures(() => {
      return importFileToStore(url, store);
    }, `${IMPORT_FLIPPER_TRACE_EVENT}:Deeplink`);
  });

  if (process.env.FLIPPER_PORTS) {
    const portOverrides = parseFlipperPorts(process.env.FLIPPER_PORTS);

    if (portOverrides) {
      store.dispatch({
        type: 'SET_SERVER_PORTS',
        payload: portOverrides
      });
    } else {
      console.error(`Ignoring malformed FLIPPER_PORTS env variable:
        "${process.env.FLIPPER_PORTS || ''}".
        Example expected format: "1111,2222".`);
    }
  }
});
