import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Channel, GetInfo, ChannelEdge, Balance } from '../../../../../shared/models/clnModels';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, getPaginatorLabel, AlertTypeEnum, DataTypeEnum, ScreenSizeEnum, FEE_RATE_TYPES, APICallStatusEnum, UI_MESSAGES, CLN_DEFAULT_PAGE_SETTINGS, SortOrderEnum, CLN_PAGE_DEFS } from '../../../../../shared/services/consts-enums-functions';
import { ApiCallStatusPayload } from '../../../../../shared/models/apiCallsPayload';
import { LoggerService } from '../../../../../shared/services/logger.service';
import { CommonService } from '../../../../../shared/services/common.service';

import { CLNChannelInformationComponent } from '../../channel-information-modal/channel-information.component';
import { CLNEffects } from '../../../../store/cln.effects';
import { RTLEffects } from '../../../../../store/rtl.effects';

import { openAlert, openConfirmation } from '../../../../../store/rtl.actions';
import { RTLState } from '../../../../../store/rtl.state';
import { channelLookup, closeChannel, updateChannel } from '../../../../store/cln.actions';
import { channels, clnPageSettings, nodeInfoAndBalanceAndNumPeers } from '../../../../store/cln.selector';
import { ColumnDefinition, PageSettings, TableSetting } from '../../../../../shared/models/pageSettings';
import { CamelCaseWithReplacePipe } from '../../../../../shared/pipes/app.pipe';
import { MAT_SELECT_CONFIG } from '@angular/material/select';

@Component({
  selector: 'rtl-cln-channel-open-table',
  templateUrl: './channel-open-table.component.html',
  styleUrls: ['./channel-open-table.component.scss'],
  providers: [
    { provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'rtl-select-overlay' } },
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Channels') }
  ]
})
export class CLNChannelOpenTableComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort, { static: false }) sort: MatSort | undefined;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator | undefined;
  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public nodePageDefs = CLN_PAGE_DEFS;
  public selFilterBy = 'all';
  public colWidth = '20rem';
  public PAGE_ID = 'peers_channels';
  public tableSetting: TableSetting = { tableId: 'open_channels', recordsPerPage: PAGE_SIZE, sortBy: 'alias', sortOrder: SortOrderEnum.DESCENDING };
  public totalBalance = 0;
  public displayedColumns: any[] = [];
  public channelsData: Channel[] = [];
  public channels: any = new MatTableDataSource([]);
  public myChanPolicy: any = {};
  public information: GetInfo = {};
  public numPeers = -1;
  public feeRateTypes = FEE_RATE_TYPES;
  public selFilter = '';
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  public errorMessage = '';
  public apiCallStatus: ApiCallStatusPayload | null = null;
  public apiCallStatusEnum = APICallStatusEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<RTLState>, private rtlEffects: RTLEffects, private clnEffects: CLNEffects, private commonService: CommonService, private router: Router, private camelCaseWithReplace: CamelCaseWithReplacePipe) {
    this.screenSize = this.commonService.getScreenSize();
    this.selFilter = this.router?.getCurrentNavigation()?.extras?.state?.filter ? this.router?.getCurrentNavigation()?.extras?.state?.filter : '';
  }

  ngOnInit() {
    this.store.select(nodeInfoAndBalanceAndNumPeers).pipe(takeUntil(this.unSubs[0])).
      subscribe((infoBalNumpeersSelector: { information: GetInfo, balance: Balance, numPeers: number }) => {
        this.information = infoBalNumpeersSelector.information;
        this.numPeers = infoBalNumpeersSelector.numPeers;
        this.totalBalance = infoBalNumpeersSelector.balance.totalBalance || 0;
        this.logger.info(infoBalNumpeersSelector);
      });
    this.store.select(clnPageSettings).pipe(takeUntil(this.unSubs[1])).
      subscribe((settings: { pageSettings: PageSettings[], apiCallStatus: ApiCallStatusPayload }) => {
        this.errorMessage = '';
        this.apiCallStatus = settings.apiCallStatus;
        if (this.apiCallStatus.status === APICallStatusEnum.ERROR) {
          this.errorMessage = this.apiCallStatus.message || '';
        }
        this.tableSetting = settings.pageSettings.find((page) => page.pageId === this.PAGE_ID)?.tables.find((table) => table.tableId === this.tableSetting.tableId) || CLN_DEFAULT_PAGE_SETTINGS.find((page) => page.pageId === this.PAGE_ID)?.tables.find((table) => table.tableId === this.tableSetting.tableId)!;
        if (this.screenSize === ScreenSizeEnum.XS || this.screenSize === ScreenSizeEnum.SM) {
          this.displayedColumns = JSON.parse(JSON.stringify(this.tableSetting.columnSelectionSM));
        } else {
          this.displayedColumns = JSON.parse(JSON.stringify(this.tableSetting.columnSelection));
        }
        this.displayedColumns.unshift('private');
        this.displayedColumns.push('actions');
        this.pageSize = this.tableSetting.recordsPerPage ? +this.tableSetting.recordsPerPage : PAGE_SIZE;
        this.colWidth = this.displayedColumns.length ? ((this.commonService.getContainerSize().width / this.displayedColumns.length) / 14) + 'rem' : '20rem';
        this.logger.info(this.displayedColumns);
      });
    this.store.select(channels).pipe(takeUntil(this.unSubs[2])).
      subscribe((channelsSeletor: { activeChannels: Channel[], pendingChannels: Channel[], inactiveChannels: Channel[], apiCallStatus: ApiCallStatusPayload }) => {
        this.errorMessage = '';
        this.apiCallStatus = channelsSeletor.apiCallStatus;
        if (this.apiCallStatus.status === APICallStatusEnum.ERROR) {
          this.errorMessage = !this.apiCallStatus.message ? '' : (typeof (this.apiCallStatus.message) === 'object') ? JSON.stringify(this.apiCallStatus.message) : this.apiCallStatus.message;
        }
        this.channelsData = channelsSeletor.activeChannels;
        if (this.channelsData.length > 0) {
          this.loadChannelsTable(this.channelsData);
        }
        this.logger.info(channelsSeletor);
      });
  }

  ngAfterViewInit() {
    if (this.channelsData.length > 0) {
      this.loadChannelsTable(this.channelsData);
    }
  }

  onViewRemotePolicy(selChannel: Channel) {
    this.store.dispatch(channelLookup({ payload: { uiMessage: UI_MESSAGES.GET_REMOTE_POLICY, shortChannelID: selChannel.short_channel_id || '', showError: true } }));
    this.clnEffects.setLookupCL.pipe(take(1)).subscribe((resLookup: ChannelEdge[]): boolean | void => {
      if (resLookup.length === 0) {
        return false;
      }
      let remoteNode: ChannelEdge = {};
      if (resLookup[0].source !== this.information.id) {
        remoteNode = resLookup[0];
      } else {
        remoteNode = resLookup[1];
      }
      const reorderedChannelPolicy = [
        [{ key: 'base_fee_millisatoshi', value: remoteNode.base_fee_millisatoshi, title: 'Base Fees (mSats)', width: 34, type: DataTypeEnum.NUMBER },
        { key: 'fee_per_millionth', value: remoteNode.fee_per_millionth, title: 'Fee/Millionth', width: 33, type: DataTypeEnum.NUMBER },
        { key: 'delay', value: remoteNode.delay, title: 'Delay', width: 33, type: DataTypeEnum.NUMBER }]
      ];
      const titleMsg = 'Remote policy for Channel: ' + ((!selChannel.alias && !selChannel.short_channel_id) ? selChannel.channel_id : (selChannel.alias && selChannel.short_channel_id) ? selChannel.alias + ' (' + selChannel.short_channel_id + ')' : selChannel.alias ? selChannel.alias : selChannel.short_channel_id);
      setTimeout(() => {
        this.store.dispatch(openAlert({
          payload: {
            data: {
              type: AlertTypeEnum.INFORMATION,
              alertTitle: 'Remote Channel Policy',
              titleMessage: titleMsg,
              message: reorderedChannelPolicy
            }
          }
        }));
      }, 0);
    });
  }

  onChannelUpdate(channelToUpdate: any) {
    if (channelToUpdate !== 'all' && channelToUpdate.state === 'ONCHAIN') {
      return;
    }
    if (channelToUpdate === 'all') {
      const confirmationMsg = [];
      this.store.dispatch(openConfirmation({
        payload: {
          data: {
            type: AlertTypeEnum.CONFIRM,
            alertTitle: 'Update Fee Policy',
            noBtnText: 'Cancel',
            yesBtnText: 'Update All',
            message: confirmationMsg,
            titleMessage: 'Update fee policy for all channels',
            flgShowInput: true,
            getInputs: [
              { placeholder: 'Base Fee (mSats)', inputType: DataTypeEnum.NUMBER, inputValue: 1000, step: 100, width: 48 },
              { placeholder: 'Fee Rate (mili mSats)', inputType: DataTypeEnum.NUMBER, inputValue: 1, min: 1, width: 48, hintFunction: this.percentHintFunction }
            ]
          }
        }
      }));
      this.rtlEffects.closeConfirm.pipe(takeUntil(this.unSubs[3])).subscribe((confirmRes) => {
        if (confirmRes) {
          const base_fee = confirmRes[0].inputValue;
          const fee_rate = confirmRes[1].inputValue;
          this.store.dispatch(updateChannel({ payload: { baseFeeMsat: base_fee, feeRate: fee_rate, channelId: 'all' } }));
        }
      });
    } else {
      this.myChanPolicy = { fee_base_msat: 0, fee_rate_milli_msat: 0 };
      this.store.dispatch(channelLookup({ payload: { uiMessage: UI_MESSAGES.GET_CHAN_POLICY, shortChannelID: channelToUpdate.short_channel_id, showError: false } }));
      this.clnEffects.setLookupCL.pipe(take(1)).subscribe((resLookup: ChannelEdge[]) => {
        if (resLookup.length > 0 && resLookup[0].source === this.information.id) {
          this.myChanPolicy = { fee_base_msat: resLookup[0].base_fee_millisatoshi, fee_rate_milli_msat: resLookup[0].fee_per_millionth };
        } else if (resLookup.length > 1 && resLookup[1].source === this.information.id) {
          this.myChanPolicy = { fee_base_msat: resLookup[1].base_fee_millisatoshi, fee_rate_milli_msat: resLookup[1].fee_per_millionth };
        } else {
          this.myChanPolicy = { fee_base_msat: 0, fee_rate_milli_msat: 0 };
        }
        this.logger.info(this.myChanPolicy);
        const titleMsg = 'Update fee policy for Channel: ' + ((!channelToUpdate.alias && !channelToUpdate.short_channel_id) ?
          channelToUpdate.channel_id : (channelToUpdate.alias && channelToUpdate.short_channel_id) ? channelToUpdate.alias +
        ' (' + channelToUpdate.short_channel_id + ')' : channelToUpdate.alias ? channelToUpdate.alias : channelToUpdate.short_channel_id);
        const confirmationMsg = [];
        setTimeout(() => {
          this.store.dispatch(openConfirmation({
            payload: {
              data: {
                type: AlertTypeEnum.CONFIRM,
                alertTitle: 'Update Fee Policy',
                noBtnText: 'Cancel',
                yesBtnText: 'Update',
                message: confirmationMsg,
                titleMessage: titleMsg,
                flgShowInput: true,
                getInputs: [
                  { placeholder: 'Base Fee (mSats)', inputType: DataTypeEnum.NUMBER, inputValue: (this.myChanPolicy.fee_base_msat === '') ? 0 : this.myChanPolicy.fee_base_msat, step: 100, width: 48 },
                  { placeholder: 'Fee Rate (mili mSats)', inputType: DataTypeEnum.NUMBER, inputValue: this.myChanPolicy.fee_rate_milli_msat, min: 1, width: 48, hintFunction: this.percentHintFunction }
                ]
              }
            }
          }));
        }, 0);
      });
      this.rtlEffects.closeConfirm.
        pipe(takeUntil(this.unSubs[4])).
        subscribe((confirmRes) => {
          if (confirmRes) {
            const base_fee = confirmRes[0].inputValue;
            const fee_rate = confirmRes[1].inputValue;
            this.store.dispatch(updateChannel({ payload: { baseFeeMsat: base_fee, feeRate: fee_rate, channelId: channelToUpdate.channel_id } }));
          }
        });
    }
    this.applyFilter();
  }

  percentHintFunction(fee_rate_milli_msat) {
    return (fee_rate_milli_msat / 10000).toString() + '%';
  }

  onChannelClose(channelToClose: Channel) {
    this.store.dispatch(openConfirmation({
      payload: {
        data: {
          type: AlertTypeEnum.CONFIRM,
          alertTitle: 'Close Channel',
          titleMessage: 'Closing channel: ' + ((!channelToClose.alias && !channelToClose.short_channel_id) ? channelToClose.channel_id :
            (channelToClose.alias && channelToClose.short_channel_id) ? channelToClose.alias + ' (' + channelToClose.short_channel_id + ')' :
              channelToClose.alias ? channelToClose.alias : channelToClose.short_channel_id),
          noBtnText: 'Cancel',
          yesBtnText: 'Close Channel'
        }
      }
    }));
    this.rtlEffects.closeConfirm.
      pipe(takeUntil(this.unSubs[5])).
      subscribe((confirmRes) => {
        if (confirmRes) {
          this.store.dispatch(closeChannel({ payload: { id: channelToClose.id || '', channelId: channelToClose.channel_id || '', force: false } }));
        }
      });
  }

  onChannelClick(selChannel: Channel, event: any) {
    this.store.dispatch(openAlert({
      payload: {
        data: {
          channel: selChannel,
          showCopy: true,
          component: CLNChannelInformationComponent
        }
      }
    }));
  }

  applyFilter() {
    this.channels.filter = this.selFilter.trim().toLowerCase();
  }

  getLabel(column: string) {
    const returnColumn: ColumnDefinition = this.nodePageDefs[this.PAGE_ID][this.tableSetting.tableId].allowedColumns.find((col) => col.column === column);
    return returnColumn ? returnColumn.label ? returnColumn.label : this.camelCaseWithReplace.transform(returnColumn.column, '_') : this.commonService.titleCase(column);
  }

  setFilterPredicate() {
    this.channels.filterPredicate = (rowData: Channel, fltr: string) => {
      let rowToFilter = '';
      switch (this.selFilterBy) {
        case 'all':
          rowToFilter = ((rowData.connected) ? 'connected' : 'disconnected') + (rowData.channel_id ? rowData.channel_id.toLowerCase() : '') +
          (rowData.short_channel_id ? rowData.short_channel_id.toLowerCase() : '') + (rowData.id ? rowData.id.toLowerCase() : '') + (rowData.alias ? rowData.alias.toLowerCase() : '') +
          (rowData.private ? 'private' : 'public') + (rowData.state ? rowData.state.toLowerCase() : '') +
          (rowData.funding_txid ? rowData.funding_txid.toLowerCase() : '') + (rowData.msatoshi_to_us ? rowData.msatoshi_to_us : '') +
          (rowData.msatoshi_total ? rowData.msatoshi_total : '') + (rowData.their_channel_reserve_satoshis ? rowData.their_channel_reserve_satoshis : '') +
          (rowData.our_channel_reserve_satoshis ? rowData.our_channel_reserve_satoshis : '') + (rowData.spendable_msatoshi ? rowData.spendable_msatoshi : '');
          break;

        case 'private':
          rowToFilter = rowData?.private ? 'private' : 'public';
          break;

        case 'connected':
          rowToFilter = rowData?.connected ? 'connected' : 'disconnected';
          break;

        case 'msatoshi_total':
        case 'spendable_msatoshi':
        case 'msatoshi_to_us':
        case 'msatoshi_to_them':
          rowToFilter = ((+(rowData[this.selFilterBy] || 0)) / 1000)?.toString() || '';
          break;

        default:
          rowToFilter = typeof rowData[this.selFilterBy] === 'undefined' ? '' : typeof rowData[this.selFilterBy] === 'string' ? rowData[this.selFilterBy].toLowerCase() : typeof rowData[this.selFilterBy] === 'boolean' ? (rowData[this.selFilterBy] ? 'yes' : 'no') : rowData[this.selFilterBy].toString();
          break;
      }
      return this.selFilterBy === 'connected' ? rowToFilter.indexOf(fltr) === 0 : rowToFilter.includes(fltr);
    };
  }

  loadChannelsTable(mychannels) {
    this.channels = new MatTableDataSource<Channel>([...mychannels]);
    this.channels.sort = this.sort;
    this.channels.sortingDataAccessor = (data: any, sortHeaderId: string) => ((data[sortHeaderId] && isNaN(data[sortHeaderId])) ? data[sortHeaderId].toLocaleLowerCase() : data[sortHeaderId] ? +data[sortHeaderId] : null);
    this.channels.paginator = this.paginator;
    this.setFilterPredicate();
    this.applyFilter();
    this.logger.info(this.channels);
  }

  onDownloadCSV() {
    if (this.channels.data && this.channels.data.length > 0) {
      this.commonService.downloadFile(this.channels.data, 'Open-channels');
    }
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(<any>null);
      completeSub.complete();
    });
  }

}
