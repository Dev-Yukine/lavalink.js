import { EventEmitter } from 'events';
import ClusterNode, { ClusterNodeOptions } from '../ClusterNode';
import Player from '../core/Player';
import { VoiceStateUpdate, VoiceServerUpdate } from './Node';
import Node from '../Node';

export default abstract class BaseCluster extends EventEmitter {
  public abstract send(guildID: string, packet: any): any;
  public abstract filter(node: ClusterNode, guildID: string): boolean;

  public readonly nodes: ClusterNode[] = [];

  constructor(options?: ClusterNodeOptions[]) {
    super();
    if (options) this.spawn(options);
  }

  public spawn(options: ClusterNodeOptions): ClusterNode;
  public spawn(options: ClusterNodeOptions[]): ClusterNode[];
  public spawn(options: ClusterNodeOptions | ClusterNodeOptions[]): ClusterNode | ClusterNode[] {
    if (Array.isArray(options)) return options.map(opt => this.spawn(opt));

    const node = new ClusterNode(this, options);
    this.nodes.push(node);
    return node;
  }

  public sort(): ClusterNode[] {
    // filter nodes for open ws connections and restrict to specified tag (if provided)
    return this.nodes.slice().sort((a, b) => { // sort by overall system cpu load
      if (!a.stats || !b.stats || !b.connected) return -1;
      return (a.stats.cpu ? a.stats.cpu.systemLoad / a.stats.cpu.cores : 0)
        - (b.stats.cpu ? b.stats.cpu.systemLoad / b.stats.cpu.cores : 0);
    });
  }

  public getNode(guildID: string): Node {
    let node = this.nodes.find(node => node.players.has(guildID));
    if (!node) node = this.sort().find(node => this.filter(node, guildID));
    if (node) return node;
    throw new Error('unable to find appropriate node; please check your filter');
  }

  public has(guildID: string): boolean {
    return this.nodes.some(node => node.players.has(guildID));
  }

  public get(guildID: string): Player {
    return this.getNode(guildID).players.get(guildID);
  }

  public voiceStateUpdate(state: VoiceStateUpdate): Promise<boolean> {
    return this.getNode(state.guild_id).voiceStateUpdate(state);
  }

  public voiceServerUpdate(server: VoiceServerUpdate): Promise<boolean> {
    return this.getNode(server.guild_id).voiceServerUpdate(server);
  }
}
