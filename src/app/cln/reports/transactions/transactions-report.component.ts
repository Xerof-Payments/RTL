import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { Payment, Invoice, ListInvoices } from '../../../shared/models/clnModels';
import { CommonService } from '../../../shared/services/common.service';
import { APICallStatusEnum, CLN_DEFAULT_PAGE_SETTINGS, MONTHS, PAGE_SIZE, ScreenSizeEnum, SCROLL_RANGES, SortOrderEnum } from '../../../shared/services/consts-enums-functions';
import { fadeIn } from '../../../shared/animation/opacity-animation';

import { RTLState } from '../../../store/rtl.state';
import { payments, listInvoices, clnPageSettings } from '../../store/cln.selector';
import { ApiCallStatusPayload } from '../../../shared/models/apiCallsPayload';
import { LoggerService } from '../../../shared/services/logger.service';
import { PageSettings, TableSetting } from '../../../shared/models/pageSettings';

@Component({
  selector: 'rtl-cln-transactions-report',
  templateUrl: './transactions-report.component.html',
  styleUrls: ['./transactions-report.component.scss'],
  animations: [fadeIn]
})
export class CLNTransactionsReportComponent implements OnInit, OnDestroy {

  public scrollRanges = SCROLL_RANGES;
  public reportPeriod = SCROLL_RANGES[0];
  public secondsInADay = 24 * 60 * 60;
  public payments: Payment[] = [];
  public invoices: Invoice[] = [];
  public colWidth = '20rem';
  public PAGE_ID = 'reports';
  public tableSetting: TableSetting = { tableId: 'transactions', recordsPerPage: PAGE_SIZE, sortBy: 'date', sortOrder: SortOrderEnum.DESCENDING };
  public displayedColumns: any[] = ['date', 'amount_paid', 'num_payments', 'amount_received', 'num_invoices'];
  public transactionsReportSummary = { paymentsSelectedPeriod: 0, invoicesSelectedPeriod: 0, amountPaidSelectedPeriod: 0, amountReceivedSelectedPeriod: 0 };
  public transactionFilterValue = '';
  public today = new Date(Date.now());
  public startDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1, 0, 0, 0);
  public endDate = new Date(this.today.getFullYear(), this.today.getMonth(), this.getMonthDays(this.today.getMonth(), this.today.getFullYear()), 23, 59, 59);
  public transactionsReportData: any = [];
  public transactionsNonZeroReportData: any = [];
  public view: [number, number] = [350, 350];
  public screenPaddingX = 100;
  public gradient = true;
  public xAxisLabel = 'Date';
  public yAxisLabel = 'Amount (Sats)';
  public showYAxisLabel = true;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private commonService: CommonService, private store: Store<RTLState>) { }

  ngOnInit() {
    this.screenSize = this.commonService.getScreenSize();
    this.showYAxisLabel = !(this.screenSize === ScreenSizeEnum.XS || this.screenSize === ScreenSizeEnum.SM);
    this.store.select(clnPageSettings).pipe(takeUntil(this.unSubs[0])).
      subscribe((settings: { pageSettings: PageSettings[], apiCallStatus: ApiCallStatusPayload }) => {
        this.tableSetting = settings.pageSettings.find((page) => page.pageId === this.PAGE_ID)?.tables.find((table) => table.tableId === this.tableSetting.tableId) || CLN_DEFAULT_PAGE_SETTINGS.find((page) => page.pageId === this.PAGE_ID)?.tables.find((table) => table.tableId === this.tableSetting.tableId)!;
        if (this.screenSize === ScreenSizeEnum.XS || this.screenSize === ScreenSizeEnum.SM) {
          this.displayedColumns = JSON.parse(JSON.stringify(this.tableSetting.columnSelectionSM));
        } else {
          this.displayedColumns = JSON.parse(JSON.stringify(this.tableSetting.columnSelection));
        }
        this.displayedColumns.push('actions');
        this.colWidth = this.displayedColumns.length ? ((this.commonService.getContainerSize().width / this.displayedColumns.length) / 14) + 'rem' : '20rem';
        this.logger.info(this.displayedColumns);
      });
    this.store.select(payments).pipe(takeUntil(this.unSubs[1]),
      withLatestFrom(this.store.select(listInvoices))).
      subscribe(([paymentsSelector, invoicesSelector]: [{ payments: Payment[], apiCallStatus: ApiCallStatusPayload }, { listInvoices: ListInvoices, apiCallStatus: ApiCallStatusPayload }]) => {
        this.payments = paymentsSelector.payments;
        this.invoices = invoicesSelector.listInvoices.invoices || [];
        this.transactionsReportData = this.filterTransactionsForSelectedPeriod(this.startDate, this.endDate);
        this.transactionsNonZeroReportData = this.prepareTableData();
      });
    this.commonService.containerSizeUpdated.pipe(takeUntil(this.unSubs[2])).subscribe((CONTAINER_SIZE) => {
      switch (this.screenSize) {
        case ScreenSizeEnum.MD:
          this.screenPaddingX = CONTAINER_SIZE.width / 10;
          break;

        case ScreenSizeEnum.LG:
          this.screenPaddingX = CONTAINER_SIZE.width / 16;
          break;

        default:
          this.screenPaddingX = CONTAINER_SIZE.width / 20;
          break;
      }
      this.view = [CONTAINER_SIZE.width - this.screenPaddingX, CONTAINER_SIZE.height / 2.2];
      this.logger.info('Container Size: ' + JSON.stringify(CONTAINER_SIZE));
      this.logger.info('View: ' + JSON.stringify(this.view));
    });
  }

  @HostListener('mouseup', ['$event']) onChartMouseUp(e) {
    if (e.srcElement.tagName === 'svg' && e.srcElement.classList.length > 0 && e.srcElement.classList[0] === 'ngx-charts') {
      this.transactionFilterValue = '';
    }
  }

  onChartBarSelected(event) {
    if (this.reportPeriod === SCROLL_RANGES[1]) {
      this.transactionFilterValue = event.series + '/' + this.startDate.getFullYear();
    } else {
      this.transactionFilterValue = event.series.toString().padStart(2, '0') + '/' + MONTHS[this.startDate.getMonth()].name + '/' + this.startDate.getFullYear();
    }
  }

  filterTransactionsForSelectedPeriod(start: Date, end: Date) {
    const startDateInSeconds = Math.round(start.getTime() / 1000);
    const endDateInSeconds = Math.round(end.getTime() / 1000);
    const transactionsReport: any[] = [];
    this.transactionsReportSummary = { paymentsSelectedPeriod: 0, invoicesSelectedPeriod: 0, amountPaidSelectedPeriod: 0, amountReceivedSelectedPeriod: 0 };
    const filteredPayments = this.payments?.filter((payment: Payment) => payment.status === 'complete' && payment.created_at && payment.created_at >= startDateInSeconds && payment.created_at < endDateInSeconds);
    const filteredInvoices = this.invoices?.filter((invoice: Invoice) => invoice.status === 'paid' && invoice.paid_at && invoice.paid_at >= startDateInSeconds && invoice.paid_at < endDateInSeconds);
    this.transactionsReportSummary.paymentsSelectedPeriod = filteredPayments.length;
    this.transactionsReportSummary.invoicesSelectedPeriod = filteredInvoices.length;
    if (this.reportPeriod === SCROLL_RANGES[1]) {
      for (let i = 0; i < 12; i++) {
        transactionsReport.push({ name: MONTHS[i].name, date: new Date(start.getFullYear(), i, 1, 0, 0, 0, 0), series: [{ name: 'Paid', value: 0, extra: { total: 0 } }, { name: 'Received', value: 0, extra: { total: 0 } }] });
      }
      filteredPayments?.map((payment) => {
        const monthNumber = new Date((payment.created_at || 0) * 1000).getMonth();
        this.transactionsReportSummary.amountPaidSelectedPeriod = this.transactionsReportSummary.amountPaidSelectedPeriod + (payment.msatoshi_sent || 0);
        transactionsReport[monthNumber].series[0].value = transactionsReport[monthNumber].series[0].value + ((payment.msatoshi_sent || 0) / 1000);
        transactionsReport[monthNumber].series[0].extra.total = transactionsReport[monthNumber].series[0].extra.total + 1;
        return this.transactionsReportSummary;
      });
      filteredInvoices?.map((invoice) => {
        const monthNumber = new Date(+(invoice.paid_at || 0) * 1000).getMonth();
        this.transactionsReportSummary.amountReceivedSelectedPeriod = this.transactionsReportSummary.amountReceivedSelectedPeriod + (invoice.msatoshi_received || 0);
        transactionsReport[monthNumber].series[1].value = transactionsReport[monthNumber].series[1].value + ((invoice.msatoshi_received || 0) / 1000);
        transactionsReport[monthNumber].series[1].extra.total = transactionsReport[monthNumber].series[1].extra.total + 1;
        return this.transactionsReportSummary;
      });
    } else {
      for (let i = 0; i < this.getMonthDays(start.getMonth(), start.getFullYear()); i++) {
        transactionsReport.push({ name: (i + 1).toString(), date: new Date((((i) * this.secondsInADay) + startDateInSeconds) * 1000), series: [{ name: 'Paid', value: 0, extra: { total: 0 } }, { name: 'Received', value: 0, extra: { total: 0 } }] });
      }
      filteredPayments?.map((payment) => {
        const dateNumber = Math.floor((+(payment.created_at || 0) - startDateInSeconds) / this.secondsInADay);
        this.transactionsReportSummary.amountPaidSelectedPeriod = this.transactionsReportSummary.amountPaidSelectedPeriod + (payment.msatoshi_sent || 0);
        transactionsReport[dateNumber].series[0].value = transactionsReport[dateNumber].series[0].value + ((payment.msatoshi_sent || 0) / 1000);
        transactionsReport[dateNumber].series[0].extra.total = transactionsReport[dateNumber].series[0].extra.total + 1;
        return this.transactionsReportSummary;
      });
      filteredInvoices?.map((invoice) => {
        const dateNumber = Math.floor((+(invoice.paid_at || 0) - startDateInSeconds) / this.secondsInADay);
        this.transactionsReportSummary.amountReceivedSelectedPeriod = this.transactionsReportSummary.amountReceivedSelectedPeriod + (invoice.msatoshi_received || 0);
        transactionsReport[dateNumber].series[1].value = transactionsReport[dateNumber].series[1].value + ((invoice.msatoshi_received || 0) / 1000);
        transactionsReport[dateNumber].series[1].extra.total = transactionsReport[dateNumber].series[1].extra.total + 1;
        return this.transactionsReportSummary;
      });
    }
    return transactionsReport;
  }

  prepareTableData() {
    return this.transactionsReportData?.reduce((acc, curr) => {
      if (curr.series[0].extra.total > 0 || curr.series[1].extra.total > 0) {
        return acc.concat({ date: curr.date, amount_paid: curr.series[0].value, num_payments: curr.series[0].extra.total, amount_received: curr.series[1].value, num_invoices: curr.series[1].extra.total });
      }
      return acc;
    }, []);
  }

  onSelectionChange(selectedValues: { selDate: Date, selScrollRange: string }) {
    const selMonth = selectedValues.selDate.getMonth();
    const selYear = selectedValues.selDate.getFullYear();
    this.reportPeriod = selectedValues.selScrollRange;
    if (this.reportPeriod === SCROLL_RANGES[1]) {
      this.startDate = new Date(selYear, 0, 1, 0, 0, 0);
      this.endDate = new Date(selYear, 11, 31, 23, 59, 59);
    } else {
      this.startDate = new Date(selYear, selMonth, 1, 0, 0, 0);
      this.endDate = new Date(selYear, selMonth, this.getMonthDays(selMonth, selYear), 23, 59, 59);
    }
    this.transactionsReportData = this.filterTransactionsForSelectedPeriod(this.startDate, this.endDate);
    this.transactionsNonZeroReportData = this.prepareTableData();
    this.transactionFilterValue = '';
  }

  getMonthDays(selMonth: number, selYear: number) {
    return (selMonth === 1 && selYear % 4 === 0) ? (MONTHS[selMonth].days + 1) : MONTHS[selMonth].days;
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(<any>null);
      completeSub.complete();
    });
  }

}

