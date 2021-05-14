import { RTCDB } from 'rtcdb';

interface ItemDto {
  boldText: string;
  text: string;
}

class VotesPerItem {
  public topVoteCount: number = 0;

  constructor(
    public readonly id: string,
    public readonly boldText: string, 
    public readonly text: string) {

  }

}

class VoteSummary {
  private items: Map<string, VotesPerItem> = new Map();
  private randomOrder: Map<string, number>;
  private voterCnt: number = 0;

  constructor(db: RTCDB, randomOrder: Map<string, number>) {
    this.randomOrder = randomOrder;
    db.forEach('items', (id, dta) => {
      let sid = id as string;      
      this.items.set(sid, new VotesPerItem(sid, dta.boldText, dta.text));
    });
    db.forEach('topVotes', (id, dta) => {
      this.voterCnt++;
      let ids: string[] = dta.split(',');
      ids.forEach(itemId => {
        let itemVotes = this.items.get(itemId);
        if (itemVotes) {
          itemVotes.topVoteCount++;
        }  
      });
    });
  }

  public get sortedItems(): VotesPerItem[] {
    let list: VotesPerItem[] = [];
    this.items.forEach((value, key) => list.push(value));
    list.sort((a, b) => b.topVoteCount - a.topVoteCount);
    return list;
  }

  public get stableItems(): VotesPerItem[] {
    let list: VotesPerItem[] = [];
    this.items.forEach((value, key) => list.push(value));
    list.sort((a, b) => {
      let cmp = this.getRandomOrderFor(a.id) - this.getRandomOrderFor(b.id);
      if (cmp != 0) {
        return cmp;
      }
      return a.id.localeCompare(b.id)
    });
    return list;
  }

  private getRandomOrderFor(itemId: string): number {
    let rnd = this.randomOrder.get(itemId);
    if (typeof(rnd) === 'undefined') {
      rnd = Math.random();
      this.randomOrder.set(itemId, rnd);
    }
    return rnd;
  }

  public get voterCount(): number {
    return this.voterCnt;
  }
}
  
class Participant {
  public readonly name: string;
  private readonly db: RTCDB;
  public readonly markCallback;

  private cachedSummary: VoteSummary|undefined;
  private randomOrder: Map<string, number> = new Map();

  private addedItemCount: number = 0;

  constructor(peer: any, ownName: string, clean: boolean, admin: boolean, markCallback: Function) {
    this.name = ownName;
    this.markCallback = markCallback;
    this.db = new RTCDB('dotVoting.' + ownName, peer, clean);
    this.db.on(['add', 'update'], 'items', false, () => this.invalidateCache());
    this.db.on(['add', 'update'], 'topVotes', false, () => this.invalidateCache());

    if (clean && admin) {
      this.setDotsPerVoter(4);
    }
  }

  public getDotsPerVoter(): number {
    return this.db.get('dotsPerVoter', 'dotsPerVoter');
  }

  public setDotsPerVoter(dotsPerVoter: number): void {
    this.db.put('dotsPerVoter', 'dotsPerVoter', dotsPerVoter);
  }

  public addItem(trimmed: string): void {
    let obj : ItemDto;
    let colonIndex = trimmed.indexOf(':');
    if (colonIndex >= 0) {
      obj = {
        boldText: trimmed.substring(0, colonIndex + 1),
        text: trimmed.substring(colonIndex + 1)
      };
    } else {
      obj = {
        boldText: '',
        text: trimmed
      };
    }
    let key;
    do {
      key = this.name + this.addedItemCount;
      this.addedItemCount++;
    } while (this.db.get('items', key))
    this.db.put('items', key, obj);
  }

  public getState(): string {
    return this.db.get('state', 'state');
  }

  public setState(state: string): void {
    return this.db.put('state', 'state', state);
  }

  private invalidateCache() {
    this.cachedSummary = undefined;
    this.markCallback();
    console.log('invalidate cache');
  }

  public connectTo(idToJoin: string): void {
    this.db.connectToNode(idToJoin);
  }

  public hasNoTopVote(): boolean {
    return typeof(this.db.get('topVotes', this.name)) !== 'string';
  }

  public get voteSummary(): VoteSummary {
    if (!this.cachedSummary) {
      this.cachedSummary = new VoteSummary(this.db, this.randomOrder);
    }
    return this.cachedSummary;
  }

  voteForTop(itemIds: string[]) {
    this.db.put('topVotes', this.name, itemIds.join(','));
    this.invalidateCache();
  }
}

export { Participant, VotesPerItem };
