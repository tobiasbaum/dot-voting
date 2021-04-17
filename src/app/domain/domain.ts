import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RTCDB } from 'rtcdb';

interface IdeaDto {
  title: string;
  details: string;
}

interface DeveloperDto {
  name: string;
  date: number;
  color: string;
  ideas: IdeaDto[];
}

  export interface MsgData {
    to: string;
    color: string;
    tc: string;
    tr: string;
  }

  class Developer {

    public open: boolean = true;
    private voterCache:Set<string>[] = [];
    private cacheInvalid: boolean = true;
    private lastMessage: string = "";
    
    constructor(
      public readonly name: string,
      private readonly db: RTCDB,
      private readonly participant: Participant) {

      this.db.on(['add', 'update'], 'votes', true, () => {
        this.cacheInvalid = true;
        this.participant.markCallback();
      });
      participant.registerMessageHandler((id: undefined, msg: any) => {
        if (msg.to == this.name) {
          this.lastMessage = msg.tc + ' ' + msg.tr;
          if (this.lastMessage.length > 40) {
            this.lastMessage = this.lastMessage.substring(0, 37) + '...';
          }
          this.participant.markCallback();
        }
      });
    }

    private get dto(): DeveloperDto {
      return this.db.get('ideas', this.name) as DeveloperDto;
    }

    public get date(): number {
      return this.dto.date;
    }

    public get ideas(): IdeaDto[] {
      return this.dto.ideas;
    }

    public setOpen(o: boolean): void {
      this.open = o;
    }

    voteCountFor(ideaIndex: number): number {
      return this.votersFor(ideaIndex).size;
    }

    voterNamesFor(ideaIndex: number): string {
      return Array.from(this.votersFor(ideaIndex)).join(', ');
    }

    private votersFor(ideaIndex: number): Set<string> {
      if (this.cacheInvalid) {
        this.voterCache = [];
        this.participant.allParticipants().forEach(p => {
          let vote = this.getVoteFrom(p);
          if (typeof(vote) == 'number') {
            if (!this.voterCache[vote]) {
              this.voterCache[vote] = new Set();
            }
            this.voterCache[vote].add(p);
          }
        });
        this.cacheInvalid = false;
      }
      if (this.voterCache[ideaIndex]) {
        return this.voterCache[ideaIndex];
      } else {
        return new Set();
      }
    }

    getVoteFrom(participantName: string): number|undefined {
      return this.db.get('votes', this.name + '.from.' + participantName);
    }

    getTopIdea(): string {
      this.votersFor(0);
      let bestCnt = 0;
      let best = "";
      for (let i = 0; i < this.voterCache.length; i++) {
        let voteCnt = this.voteCountFor(i);
        if (voteCnt > bestCnt) {
          bestCnt = voteCnt;
          best = this.ideas[i].title;
        }
      }
      return best;
    }

    getTopIdeaVoteCount(): number {
      this.votersFor(0);
      let bestCnt = 0;
      for (let i = 0; i < this.voterCache.length; i++) {
        let voteCnt = this.voteCountFor(i);
        if (voteCnt > bestCnt) {
          bestCnt = voteCnt;
        }
      }
      return bestCnt;
    }

    getTotalVoteCount(): number {
      this.votersFor(0);
      let sum = 0;
      for (let i = 0; i < this.voterCache.length; i++) {
        sum += this.voteCountFor(i);
      }
      return sum;
    }

    getLastMessage(): string {
      return this.lastMessage;
    }

    getLastMessageTime(): string {
      let m = this.lastMessage.match(/[0-9][0-9]:[0-9][0-9]/);
      if (m) {
        return m[0];
      } else {
        return "";
      }
    }  
  }
  
  class Participant {
    private readonly id: string;
    public readonly name: string;
    private readonly color: string;
    private participants: string[] = [];
    private developers: Developer[] = [];
    private readonly db: RTCDB;
    public readonly markCallback;
    private sortedByMsg: boolean = false;

    constructor(peer: any, ownId: string, ownName: string, ideas: IdeaDto[]|undefined, markCallback: Function) {
      this.id = ownId;
      this.name = ownName;
      this.markCallback = markCallback;
      let clean = typeof(ideas) != 'undefined';
      this.db = new RTCDB('ideenmesse.' + ownName, peer, ownId, localStorage, clean);
      this.db.on('add', 'ideas', true, (name: string, data: any) => {
        this.participants.push(name);
        if (data.ideas.length > 0) {
          let dev = new Developer(name, this.db, this);
          this.developers.push(dev);
          this.ensureDevelopersSorted();
        }
        markCallback();
      });

      if (clean) {
        let h = Math.floor(Math.random() * 72) * 5;
        let s = 85 + Math.floor(Math.random() * 10);
        let l = 35 + Math.floor(Math.random() * 10);
        this.color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
        let me : DeveloperDto = {
          name: ownName,
          color: this.color,
          date: new Date().getTime(),
          ideas: ideas as IdeaDto[]
        }
        this.db.put('ideas', ownName, me);
      } else {
        this.color = (this.db.get('ideas', ownName) as DeveloperDto).color;
      }
    }

    getPeerID() {
      return this.id;
    }

    registerMessageHandler(handler: Function) {
        this.db.on('add', 'messages', true, handler);
    }
  
    registerPlayerChangeHandler(handler: Function) {
      this.db.on('add', 'currentPlayer', true, handler);
      this.db.on('update', 'currentPlayer', false, handler);
      this.db.on('add', 'playerData', true, handler);
    }

    connectToOtherPlayer(id: string) {
      this.db.connectToNode(id);
    }

    public sortByMsg(b: boolean) {
      this.sortedByMsg = b;
      this.ensureDevelopersSorted();
    }
  
    private ensureDevelopersSorted() {
      if (this.sortedByMsg) {
        this.developers.sort((a, b) => b.getLastMessageTime().localeCompare(a.getLastMessageTime()));
      } else {
        this.developers.sort((a, b) => a.date - b.date);
      }
    }

    public allParticipants(): string[] {
      return this.participants;
    }

    public allDevelopers(): Developer[] {
      this.ensureDevelopersSorted();
      return this.developers;
    }

    sendMessage(msg: string, to: string) {
      this.sendMessageRaw(this.makeColored(to, curTime() + ' ' + this.name, msg));
    }

    makeColored(to: string, tc: string, tr: string): MsgData {
      return {
          color: this.color,
          to: to,
          tc: tc,
          tr: tr
      }
    }

    sendMessageRaw(msg: MsgData) {
      this.db.add('messages', msg);
    }    

    votedFor(d: Developer): boolean {
      return typeof(d.getVoteFrom(this.name)) == 'number';
    }
  
    voteFor(d: Developer, ideaIdx: number): void {
      this.db.put('votes', d.name + '.from.' + this.name, ideaIdx);
    }
  
  }

function curTime(): string {
  return new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
}

export { Participant };
