import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'ideenmesse-peer-status',
  templateUrl: './peer-status.component.html',
  styleUrls: ['./peer-status.component.scss']
})
export class PeerStatusComponent implements OnInit {

  @Input()
  public peer: any|undefined;

  constructor() { }

  ngOnInit(): void {
  }

  public get peerId(): string {
    if (this.peer) {
      return this.peer.id;
    } else {
      return '';
    }
  }

  public get statusString(): string {
    if (!this.peer) {
      return 'missing';
    } else if (this.peer.destroyed) {
      return 'destroyed';
    } else if (this.peer.disconnected) {
      return 'disconnected';
    } else {
      return 'connected';
    }
  }

  public get openConnections(): string[] {
    return this.getConnections(true);
  }

  public get closedConnections(): string[] {
    return this.getConnections(false);
  }

  private getConnections(open: boolean): string[] {
    if (!this.peer) {
      return [];
    }
    let ret: string[] = [];
    Object.keys(this.peer.connections).forEach(key => {
      let conn = this.peer.connections[key][0];
      if ((conn && conn.open) === open) {
        ret.push(key);
      }
    });
    return ret;
  }

}
