/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import { SecureServerConfig } from './utils/CertificateProvider';
import { Logger } from './fb-interfaces/Logger';
import { ClientQuery } from './Client';
import { Store } from './reducers';
import os from 'os';
import CertificateProvider from './utils/CertificateProvider';
import { RSocketServer} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import { Single } from 'rsocket-flowable';
import Client from './Client';
import { UninitializedClient } from './UninitializedClient';
import { reportPlatformFailures } from './utils/metrics';
import * as net from 'net'
import {EventEmitter} from 'events'
import {PartialResponder, Payload, ReactiveSocket} from "rsocket-types"
import {isString} from "typeguard"

const mdns = require('multicast-dns')();



const invariant = require('invariant');

const tls = require('tls');

const MDNS_NAME = 'fbflipper._fbflipper._tcp.local';

type ClientInfo = {
  connection: ReactiveSocket<string,string> | null | undefined;
  client: Client;
};
export default class Server extends EventEmitter {
  connections: Map<string, ClientInfo>;
  secureServer: Promise<RSocketServer<string,string>> | null = null;
  insecureServer: Promise<RSocketServer<string,string>> | null = null;
  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;
  logger: Logger;
  store: Store;
  initialisePromise: Promise<void> | null = null;

  constructor(logger: Logger, store: Store) {
    super();
    this.logger = logger;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, logger);
    this.connectionTracker = new ConnectionTracker(logger);
    this.store = store;
  }

  on(event: "error", callback: (err: Error) => void): this
  on(event: "new-client", callback: (client: Client) => void): this
  on(event: "clients-change", callback: () => void): this
  on(event: string | symbol, callback: any): this {
    return super.on(event, callback)
  }
  
  init() {
    const {
      insecure,
      secure
    } = this.store.getState().application.serverPorts;

    try {
      this.startMDnsServer(insecure, secure);
    } catch (err) {
      console.error('Unable to start MDNS advertiser', err);
    }

    this.initialisePromise = this.certificateProvider.loadSecureServerConfig().then(options => this.secureServer = this.startServer(secure, options)).then(() => {
      this.insecureServer = this.startServer(insecure);
      return;
    });
    reportPlatformFailures(this.initialisePromise, 'initializeServer');
    return this.initialisePromise;
  }
  /**
   * Responds to mDns queries with network info
   *
   * @param query
   */


  startMDnsServer(insecure: number, secure: number) {
    mdns.on('response', (_response: any) => {//console.log('Response',response);
    });
    mdns.on('query', (query: any) => {
      //console.log(query);
      if (!Array.isArray(query.questions)) {
        return;
      } // eslint-disable-next-line prettier/prettier


      const question = query.questions.find(function (q: any) {
        return q.type === 'PTR' && q.class.includes('UNKNOWN') || // eslint-disable-next-line prettier/prettier
        q.name.includes('fbflipper');
      });

      if (question) {
        //console.log('got a query packet:', question, query);
        const addresses = getNetworkAddresses();
        mdns.respond({
          additionals: [{
            class: 'IN',
            name: MDNS_NAME,
            type: 'TXT',
            flush: true,
            ttl: 30,
            data: [Buffer.from(`ips=${addresses.join(",")}`), Buffer.from(`insecurePort=${insecure}`), Buffer.from(`securePort=${secure}`)]
          }, ...addresses.reduce((additionals, address) => {
            additionals.push({
              class: 'IN',
              name: MDNS_NAME,
              type: 'A',
              flush: true,
              ttl: 30,
              data: address
            }, {
              class: 'IN',
              name: MDNS_NAME,
              type: 'SRV',
              flush: true,
              ttl: 30,
              data: {
                target: MDNS_NAME,
                insecure
              }
            });
            return additionals;
          }, [] as any)],
          answers: [{
            class: 'IN',
            data: `fbflipper._fbflipper._tcp.local`,
            type: 'PTR',
            flush: true,
            ttl: 30,
            name: '_fbflipper._tcp.local'
          }]
        });
      }
    });
  }

  startServer(port: number, sslConfig?: SecureServerConfig): Promise<RSocketServer<string,string>> {
    const server = this;
    return new Promise((resolve, reject) => {
      let rsServer: RSocketServer<string,string> | null = null;

      const serverFactory = (onConnect:((socket: net.Socket) => void)): net.Server => {
        const transportServer = sslConfig ? tls.createServer(sslConfig, (socket: net.Socket) => {
          onConnect(socket);
        }) : net.createServer(onConnect);
        transportServer.on('error', (err: Error) => {
          server.emit('error', err);
          console.error(`Error opening server on port ${port}`, 'server');
          reject(err);
        }).on('listening', () => {
          console.debug(`${sslConfig ? 'Secure' : 'Certificate'} server started on port ${port}`, 'server');
          server.emit('listening', port);
          resolve(rsServer!!);
        });
        return transportServer;
      };

      rsServer = new RSocketServer<string,string>({
        getRequestHandler: sslConfig ? this._trustedRequestHandler : this._untrustedRequestHandler,
        transport: new RSocketTCPServer({
          port,
          serverFactory
        })
      });
      rsServer.start();
    });
  }

  _trustedRequestHandler = (conn: ReactiveSocket<string, string>, connectRequest:Payload<string, string> ): PartialResponder<string, string> => {
    const server = this;
    const clientData: ClientQuery = JSON.parse(connectRequest.data!!);
    this.connectionTracker.logConnectionAttempt(clientData);
    const client = this.addConnection(conn, clientData);
    conn.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          console.debug(`Device disconnected ${client.id}`, 'server');
          server.removeConnection(client.id);
        }
      },

      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      }

    });
    return client.responder;
  };
  _untrustedRequestHandler = (_conn: ReactiveSocket<string, string>, connectRequest:Payload<string, string>): PartialResponder<string, string> => {
    const clientData = JSON.parse(connectRequest.data!!);
    this.connectionTracker.logConnectionAttempt(clientData);
    const client: UninitializedClient = {
      os: clientData.os,
      deviceName: clientData.device,
      appName: clientData.app
    };
    this.emit('start-client-setup', client);
    return {
      requestResponse: payload => {
        if (!isString(payload.data)) {
          return Single.of({} as Payload<string,string>);
        }

        let rawData;

        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'clientMessage', 'server');
          return Single.of({} as Payload<string,string>);
        }

        const json: {
          method: "signCertificate";
          csr: string;
          destination: string;
        } = rawData;

        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          const {
            csr,
            destination
          } = json;
          return new Single(subscriber => {
            subscriber.onSubscribe();
            reportPlatformFailures(this.certificateProvider.processCertificateSigningRequest(csr, clientData.os, destination), 'processCertificateSigningRequest').then(result => {
              subscriber.onComplete({
                data: JSON.stringify({
                  deviceId: result.deviceId
                }),
                metadata: ''
              });
              this.emit('finish-client-setup', {
                client,
                deviceId: result.deviceId
              });
            }).catch(e => {
              subscriber.onError(e);
              this.emit('client-setup-error', {
                client,
                error: e
              });
            });
          });
        }
        
        return Single.of({} as Payload<string,string>);
      },
      // Leaving this here for a while for backwards compatibility,
      // but for up to date SDKs it will no longer used.
      // We can delete it after the SDK change has been using requestResponse for a few weeks.
      fireAndForget: payload => {
        if (!isString(payload.data)) {
          return
        }

        let rawData;

        try {
          rawData = JSON.parse(payload.data!!);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'server');
          return;
        }

        const json: {
          method: "signCertificate";
          csr: string;
          destination: string;
        } = rawData;

        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          const {
            csr,
            destination
          } = json;
          this.certificateProvider.processCertificateSigningRequest(csr, clientData.os, destination).catch(e => {
            console.error(e);
          });
        }
      }
    };
  };

  close(): Promise<void> {
    if (this.initialisePromise) {
      return this.initialisePromise.then(_ => {
        return Promise.all([this.secureServer!!.then(server => server.stop()), this.insecureServer!!.then(server => server.stop())]).then(() => undefined);
      });
    }

    return Promise.resolve();
  }

  toJSON(): null {
    return null;
  }

  addConnection(conn: ReactiveSocket<string,string>, query: ClientQuery): Client {
    invariant(query, 'expected query');
    const id = `${query.app}#${query.os}#${query.device}#${query.device_id}`;
    console.debug(`Device connected: ${id}`, 'server');
    const client = new Client(id, query, conn, this.logger, this.store);
    const info = {
      client,
      connection: conn
    };
    client.init().then(() => {
      console.debug(`Device client initialised: ${id}. Supported plugins: ${client.plugins.join(', ')}`, 'server');
      /* If a device gets disconnected without being cleaned up properly,
       * Flipper won't be aware until it attempts to reconnect.
       * When it does we need to terminate the zombie connection.
       */

      if (this.connections.has(id)) {
        const connectionInfo = this.connections.get(id);
        connectionInfo && connectionInfo.connection && connectionInfo.connection.close();
        this.removeConnection(id);
      }

      this.connections.set(id, info);
      this.emit('new-client', client);
      this.emit('clients-change');
      client.emit('plugins-change');
    });
    return client;
  }

  attachFakeClient(client: Client) {
    this.connections.set(client.id, {
      client,
      connection: null
    });
  }

  removeConnection(id: string) {
    const info = this.connections.get(id);

    if (info) {
      info.client.emit('close');
      this.connections.delete(id);
      this.emit('clients-change');
      this.emit('removed-client', id);
    }
  }

}

class ConnectionTracker {
  timeWindowMillis = 20 * 1000;
  connectionProblemThreshold = 4; // "${device}.${app}" -> [timestamp1, timestamp2...]

  connectionAttempts: Map<string, Array<number>> = new Map();
  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logConnectionAttempt(client: ClientQuery) {
    const key = `${client.os}-${client.device}-${client.app}`;
    const time = Date.now();
    var entry = this.connectionAttempts.get(key) || [];
    entry.push(time);
    entry = entry.filter(t => t >= time - this.timeWindowMillis);
    this.connectionAttempts.set(key, entry);

    if (entry.length >= this.connectionProblemThreshold) {
      console.error(`Connection loop detected with ${key}. Connected ${this.connectionProblemThreshold} times within ${this.timeWindowMillis / 1000}s.`, 'server');
    }
  }

}

function getNetworkAddresses(): Array<string> {
  return Object.entries(os.networkInterfaces()).reduce((addresses, [_name, iface]: [string, Array<os.NetworkInterfaceInfo>]) => {
    addresses.push(
      ...iface.filter((it:os.NetworkInterfaceInfo) => 'IPv4' === it.family && !it.internal && it.address).map(it => it.address));
    return addresses;
  }, Array<string>());
}