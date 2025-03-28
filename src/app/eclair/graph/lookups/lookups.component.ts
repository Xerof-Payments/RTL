import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import { APICallStatusEnum, ECLActions, ScreenSizeEnum } from '../../../shared/services/consts-enums-functions';
import { CommonService } from '../../../shared/services/common.service';
import { LookupNode } from '../../../shared/models/eclModels';
import { LoggerService } from '../../../shared/services/logger.service';

import { RTLState } from '../../../store/rtl.state';
import { peerLookup } from '../../store/ecl.actions';

@Component({
  selector: 'rtl-ecl-lookups',
  templateUrl: './lookups.component.html',
  styleUrls: ['./lookups.component.scss']
})
export class ECLLookupsComponent implements OnInit, OnDestroy {

  @ViewChild('form', { static: true }) form: any;
  public lookupKeyCtrl = new UntypedFormControl();
  // Public lookupKey = '';
  public nodeLookupValue: LookupNode = {};
  public channelLookupValue = [];
  public flgSetLookupValue = false;
  public messageObj = [];
  public selectedFieldId = 0;
  public lookupFields = [
    { id: 0, name: 'Node', placeholder: 'Node ID' },
    { id: 1, name: 'Channel', placeholder: 'Short Channel ID' }
  ];
  public flgLoading: Array<Boolean | 'error'> = [true];
  public faSearch = faSearch;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject()];

  constructor(private logger: LoggerService, private commonService: CommonService, private store: Store<RTLState>, private actions: Actions) {
    this.screenSize = this.commonService.getScreenSize();
  }

  ngOnInit() {
    this.actions.pipe(
      takeUntil(this.unSubs[0]),
      filter((action) => (action.type === ECLActions.SET_LOOKUP_ECL || action.type === ECLActions.UPDATE_API_CALL_STATUS_ECL))).
      subscribe((resLookup: any) => {
        if (resLookup.type === ECLActions.SET_LOOKUP_ECL) {
          this.flgLoading[0] = true;
          switch (this.selectedFieldId) {
            case 0:
              this.nodeLookupValue = resLookup.payload[0] ? JSON.parse(JSON.stringify(resLookup.payload[0])) : { nodeid: '' };
              break;
            case 1:
              this.channelLookupValue = JSON.parse(JSON.stringify(resLookup.payload)) || [];
              break;
            default:
              break;
          }
          this.flgSetLookupValue = true;
          this.logger.info(this.nodeLookupValue);
          this.logger.info(this.channelLookupValue);
        }
        if (resLookup.type === ECLActions.UPDATE_API_CALL_STATUS_ECL && resLookup.payload.status === APICallStatusEnum.ERROR && resLookup.payload.action === 'Lookup') {
          this.flgLoading[0] = 'error';
        }
      });
    this.lookupKeyCtrl.valueChanges.pipe(takeUntil(this.unSubs[1])).subscribe((value) => {
      this.nodeLookupValue = {};
      this.channelLookupValue = [];
      this.flgSetLookupValue = false;
    });
  }

  onLookup(): boolean | void {
    if (!this.lookupKeyCtrl.value) {
      this.lookupKeyCtrl.setErrors({ required: true });
      return true;
    } else if (this.lookupKeyCtrl.value && (this.lookupKeyCtrl.value.includes('@') || this.lookupKeyCtrl.value.includes(','))) {
      this.lookupKeyCtrl.setErrors({ invalid: true });
      return true;
    } else {
      if (!this.selectedFieldId) {
        this.selectedFieldId = 0;
      }
      this.flgSetLookupValue = false;
      this.nodeLookupValue = {};
      this.channelLookupValue = [];
      switch (this.selectedFieldId) {
        case 0:
          this.store.dispatch(peerLookup({ payload: this.lookupKeyCtrl.value.trim() }));
          break;
        case 1:
          // this.store.dispatch(channelLookup({ payload: {shortChannelID: this.lookupKey.trim(), showError: false} }));
          break;
        default:
          break;
      }
    }
  }

  onSelectChange(event: any) {
    this.resetData();
    this.selectedFieldId = event.value;
  }

  resetData() {
    this.flgSetLookupValue = false;
    this.nodeLookupValue = {};
    this.channelLookupValue = [];
    this.lookupKeyCtrl.setValue('');
    this.lookupKeyCtrl.setErrors(null);
    this.form.resetForm();
  }

  clearLookupValue() {
    this.nodeLookupValue = {};
    this.channelLookupValue = [];
    this.flgSetLookupValue = false;
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(<any>null);
      completeSub.complete();
    });
  }

}
