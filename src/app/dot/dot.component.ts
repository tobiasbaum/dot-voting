import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-dot',
  templateUrl: './dot.component.html',
  styleUrls: ['./dot.component.scss']
})
export class DotComponent implements OnInit {

  @Input()
  public empty: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

}
