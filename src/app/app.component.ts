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

  private itemNumber: number = 0;

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

  public voteForTop() {
    let topVote = this.getRadioList('topVoteForm', 'topVote');
    let selection = topVote.value;
    if (!selection) {
      alert('Bitte wählen Sie einen Vorschlag aus!');
      return;
    }
    this.participant.voteForTop(selection);
    this.state = 'summary';
  }

  private getSelectValue(formName: string, selectName: string): string {
    return this.getSelectElement(formName, selectName).value;
  }

  private getSelectElement(formName: string, selectName: string) {
    let form = document.forms.namedItem(formName);
    return form?.elements.namedItem(selectName) as HTMLSelectElement;
  }

  private getRadioList(formName: string, radioName: string) {
    let form = document.forms.namedItem(formName);
    return form?.elements.namedItem(radioName) as RadioNodeList;
  }

  public itemId(index: number, item: VotesPerItem) {
    return item.id;
  }

  public activateEstimationType(value: string) {
    let type = this.getRadioList('estimationForm', 'estimationType');
    type.value = value;
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
