import { Routes, RouterModule } from '@angular/router';
import { ModuleWithProviders } from '@angular/core';

import { LNDRootComponent } from './lnd-root.component';
import { HomeComponent } from './home/home.component';
import { UnlockLNDComponent } from './unlock-lnd/unlock-lnd.component';
import { ChannelClosedComponent } from './channels/channel-closed/channel-closed.component';
import { ChannelManageComponent } from './channels/channel-manage/channel-manage.component';
import { ChannelPendingComponent } from './channels/channel-pending/channel-pending.component';
import { PeersComponent } from './peers/peers.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { SendReceiveTransComponent } from './old-transactions/send-receive/send-receive-trans.component';
import { ListTransactionsComponent } from './old-transactions/list-transactions/list-transactions.component';
import { QueryRoutesComponent } from './payments/query-routes/query-routes.component';
import { LookupsComponent } from './lookups/lookups.component';
import { ForwardingHistoryComponent } from './switch/forwarding-history.component';
import { RoutingPeersComponent } from './routing-peers/routing-peers.component';
import { ChannelBackupComponent } from './channels/channel-backup/channel-backup.component';
import { ChannelRestoreComponent } from './channels/channel-restore/channel-restore.component';
import { OnChainComponent } from './on-chain/on-chain.component';

import { AuthGuard, LNDUnlockedGuard } from '../shared/services/auth.guard';
import { NotFoundComponent } from '../shared/components/not-found/not-found.component';

export const LndRoutes: Routes = [
  { path: '', component: LNDRootComponent,
    children: [
    { path: 'unlocklnd', component: UnlockLNDComponent, canActivate: [AuthGuard] },
    { path: 'home', component: HomeComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'peers', component: PeersComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'chnlclosed', component: ChannelClosedComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'chnlmanage', component: ChannelManageComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'chnlpending', component: ChannelPendingComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'chnlbackup', component: ChannelBackupComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'chnlrestore', component: ChannelRestoreComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'transactions', component: TransactionsComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'onchain', component: OnChainComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'translist', component: ListTransactionsComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'queryroutes', component: QueryRoutesComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'switch', component: ForwardingHistoryComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'routingpeers', component: RoutingPeersComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'lookups', component: LookupsComponent, canActivate: [LNDUnlockedGuard] },
    { path: 'forwardinghistory', redirectTo: 'switch' },
    { path: '**', component: NotFoundComponent }
  ]}
];

export const LNDRouting: ModuleWithProviders = RouterModule.forChild(LndRoutes);
