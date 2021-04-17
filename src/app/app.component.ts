import { NgZone } from '@angular/core';
import { Component } from '@angular/core';
import Peer from 'peerjs';
import { ParticipantStoreService } from './participant-store.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public state: string = 'initial';
  public peer: Peer|undefined;

  public formData = {
    meetingID: this.getSettingValue('distEstMeetingID', '')
  }

  getSettingValue(key: string, defaultValue: string): string {
    let paramValue = new URL(location.href).searchParams.get(key);
    if (paramValue) {
      return paramValue;
    }
    let storedValue = localStorage.getItem(key);
    if (storedValue) {
      return storedValue;
    }
    return defaultValue;
  }

  constructor(
    public fieldService: ParticipantStoreService,
    private ngz: NgZone) {
  }

  public isVoter(): boolean {
    return typeof(this.formData.meetingID) === 'string' && this.formData.meetingID.startsWith('v-');    
  }

  public isAdmin(): boolean {
    return typeof(this.formData.meetingID) === 'string' && this.formData.meetingID.startsWith('a-');    
  }

  public initNew(): void {
    this.createPeer('admin');    
  }

  public joinAsVoter(): void {
    this.createPeer('voter');    
  }

  public joinAsAdmin(): void {
    this.createPeer('admin');    
  }

  private createPeer(targetState: string) {
    //var peer = new Peer(undefined, {host: 'localhost', port: 9000, key: 'peerjs', debug: 2});
    this.peer = new Peer(undefined, 
      {
        config: {
          iceServers: [
            {urls: 'stun:stun.l.google.com:19302' },
            {urls: 'turn:v2202012136631136755.bestsrv.de', username: 'ideenmesse', credential: 'clarifying-behind-anchoring-storyboard'}
          ]
        }
      }
    );
    this.peer.on('error', (err: any) => {
        console.log(err);
    });
    (this.peer as any).once('open', (id: string) => {
        this.ngz.run(() => this.initParticipant(targetState));
    });
  }

  private initParticipant(targetState: string) {
    this.state = targetState;
  }
}
