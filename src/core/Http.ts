import * as http from 'http';
import { URL } from 'url';
import Client from './Client';

export interface Track {
  track: string;
  info: {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri: string;
  };
}

export default class Http {
  public readonly client: Client;
  public input: string;
  public base?: string;

  constructor(client: Client, input: string, base?: string) {
    this.client = client;
    this.input = input;
    this.base = base;
  }

  public load(identifier: string) {
    const url = new URL(this.input, this.base);
    url.pathname = '/loadtracks';
    url.search = `identifier=${identifier}`;

    return this._make('GET', url);
  }

  public decode(track: string): Promise<Track>;
  public decode(tracks: string[]): Promise<Track[]>;
  public decode(tracks: string | string[]): Promise<Track | Track[]> {
    const url = new URL(this.input, this.base);
    if (Array.isArray(tracks)) {
      url.pathname = '/decodetracks';
      return this._make('POST', url, Buffer.from(JSON.stringify(tracks)));
    } else {
      url.pathname = '/decodetrack';
      url.search = `track=${tracks}`;
      return this._make('GET', url);
    }
  }

  private async _make<T = any>(method: string, url: URL, data?: Buffer): Promise<T> {
    const message = await new Promise<http.IncomingMessage>((resolve) => {
      const req = http.request(Object.assign(url, { method }), resolve);
      req.setHeader('Authorization', this.client.password);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Accept', 'application/json');

      if (data) req.write(data);
      req.end();
    });

    if (message.statusCode && message.statusCode >= 200 && message.statusCode < 300) {
      const chunks: Array<Buffer> = [];
      message.on('data', (chunk) => {
        if (typeof chunk === 'string') chunk = Buffer.from(chunk);
        chunks.push(chunk);
      });

      return new Promise<T>(resolve => {
        message.on('end', () => {
          const data = Buffer.concat(chunks);
          resolve(JSON.parse(data.toString()));
        });
      });
    } else {
      return Promise.reject(message);
    }
  }
}