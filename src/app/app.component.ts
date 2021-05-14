import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Component } from '@angular/core';
import Peer from 'peerjs';
import { Participant, VotesPerItem } from './domain/domain';
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
    meetingID: this.getSettingValue('dotVotingMeetingID', '')
  }

  private votes: string[] = [];

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
    private cdr: ChangeDetectorRef,
    private ngz: NgZone) {
  }

  public isVoter(): boolean {
    return typeof(this.formData.meetingID) === 'string' && this.formData.meetingID.startsWith('v-');    
  }

  public isAdmin(): boolean {
    return typeof(this.formData.meetingID) === 'string' && this.formData.meetingID.startsWith('a-');    
  }

  public initNew(): void {
    this.createPeer('summary', undefined);    
  }

  public joinAsVoter(): void {
    this.joinAs('voter');    
  }

  public joinAsAdmin(): void {
    this.joinAs('summary');    
  }

  private joinAs(targetState: string) {
    if (!this.formData.meetingID) {
      alert('Bitte Meeting-ID angeben');
    }
    let peerId = this.formData.meetingID.substring(2);
    this.createPeer(targetState, peerId);
  }

  private createPeer(targetState: string, idToJoin: string | undefined) {
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
      if (!this.formData.meetingID) {
        this.formData.meetingID = 'a-' + id;
      }
      this.ngz.run(() => this.initParticipant(targetState, idToJoin));
    });
  }

  private initParticipant(targetState: string, idToJoin: string | undefined) {
    console.log('mid=' + this.formData.meetingID);
    this.fieldService.init(new Participant(
      this.peer, 
      this.formData.meetingID.substring(2) + this.getOrGenerateName(),
      true,
      this.isAdmin(),
      () => this.ngz.run(() => this.cdr.markForCheck())));
    if (idToJoin) {
      this.fieldService.participant.connectTo(idToJoin);
    }
    this.state = targetState;
  }

  private getOrGenerateName(): string {
    let paramValue = new URL(location.href).searchParams.get('user');
    if (paramValue) {
      return paramValue;
    }
    let name = window.localStorage.getItem('myUsername');
    if (!name) {
      name = Date.now().toString(36) + Math.round(Math.random() * 1000000).toString(36);
      window.localStorage.setItem('myUsername', name);
    }
    return name;
  }

  public get participant() {
    return this.fieldService.participant;
  }

  public getAdminLink(): string {
    return this.getLink('a-');    
  }

  public getVoterLink(): string {
    return this.getLink('v-');    
  }

  private getLink(prefix: string): string {
    if (!this.peer) {
      return '';
    }
    return window.location.href.split('?')[0] + "?dotVotingMeetingID=" + prefix + this.peer.id;
  }

  public reconnect() {
    let id = prompt('Ziel-Peer-ID', this.formData.meetingID);
    if (id) {
      this.fieldService.participant.connectTo(id);
    }  
  }

  public getRemainingDots(): number {
    return this.participant.getDotsPerVoter() - this.votes.length;
  }

  public addDotFor(itemId: string) {
    this.votes.push(itemId);
  }

  public removeDotFor(itemId: string) {
    var index = this.votes.indexOf(itemId);
    console.log('removeDotFor ' + itemId + ' - ' + index);
    if (index !== -1) {
      this.votes.splice(index, 1);
    }
  }

  public getDotCountFor(itemId: string) {
    let count = 0;
    this.votes.forEach(x => {
      if (x === itemId) {
        count++;
      }
    });
    return count;
  }

  public saveVote() {
    this.participant.voteForTop(this.votes);
    this.state = 'summary';
  }

  public itemId(index: number, item: VotesPerItem) {
    return item.id;
  }

  public addNewItems(): void {
    let form = document.forms.namedItem('newItems');
    let sel = form?.elements.namedItem('itemInput') as HTMLTextAreaElement;
    let val = sel.value;
    if (!val) {
      return;
    }
    let items = val.replace("\r\n", "\n").split("\n\n");
    items.forEach(item => {
      let trimmed = item.trim();
      if (trimmed.length > 0) {
        this.participant.addItem(trimmed);
      }
    })
    sel.value = '';
  }

}
