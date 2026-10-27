import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { formatPrice, getTeamColor } from '../utils/formatters';
import TimerCircle from '../components/TimerCircle';
import PlayerCard from '../components/PlayerCard';
import BiddingPaddle from '../components/BiddingPaddle';
import HammerControls from '../components/HammerControls';

export default function LiveArenaScreen({ onOpenLogin, onOpenPlayerPool }) {
  const { auction, timer, maxTimer, currentPlayer, user, recentBidNotice, resolutionNotice, serverUrl, startLot, players } = useAuction();

  const isLive = auction.status === 'live';
  const isPaused = auction.status === 'paused';
  const leadingTeam = auction.leadingTeamId;
  const currentBid = auction.currentBid || 0;
  const history = auction.bidHistory || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner: Stage & Timer Header */}
      <View style={styles.arenaHeader}>
        <View style={styles.stageCol}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusTag,
              isLive ? styles.tagLive : isPaused ? styles.tagPaused : styles.tagIdle
            ]}>
              <Text style={styles.statusTagText}>
                {isLive ? 'LIVE LOT' : isPaused ? 'PAUSED' : 'AUCTION IDLE'}
              </Text>
            </View>
            {auction.round && (
              <Text style={styles.roundText}>ROUND {auction.round}</Text>
            )}
          </View>
          <Text style={styles.sessionTitle}>IPL 2026 MEGA AUCTION</Text>
        </View>

        <TimerCircle
          timer={timer}
          maxTimer={maxTimer}
          isPaused={isPaused}
        />
      </View>

      {/* Resolution Sold/Unsold Banner */}
      {resolutionNotice && (
        <View style={[
          styles.resolutionBanner,
          resolutionNotice.type === 'SOLD' ? styles.soldBanner : styles.unsoldBanner
        ]}>
          <Text style={styles.resolutionText}>
            {resolutionNotice.type === 'SOLD'
              ? `SOLD: ${resolutionNotice.player?.name || 'Player'} to ${resolutionNotice.team?.shortName || resolutionNotice.team?.name || 'Franchise'} for ${formatPrice(resolutionNotice.price)}`
              : `UNSOLD: ${resolutionNotice.player?.name || 'Player'} passed to accelerated pool`
            }
          </Text>
        </View>
      )}

      {/* Recent Bid Flash Notification */}
      {recentBidNotice && (
        <View style={styles.bidFlash}>
          <Text style={styles.flashText}>
            NEW BID: {recentBidNotice.team?.name || recentBidNotice.team} — {formatPrice(recentBidNotice.bid?.amount || recentBidNotice.bid)}
          </Text>
        </View>
      )}

      {/* Player Card Dossier */}
      <PlayerCard
        player={currentPlayer}
        status={auction.status}
        serverUrl={serverUrl}
      />

      {/* Current Leading Bid Display */}
      {currentPlayer && (
        <View style={styles.bidBanner}>
          <View style={styles.bidBannerLeft}>
            <Text style={styles.bidBannerLabel}>CURRENT HIGH BID</Text>
            <Text style={styles.bidBannerAmount}>
              {currentBid > 0 ? formatPrice(currentBid) : 'NO BIDS YET'}
            </Text>
          </View>

          <View style={styles.bidBannerRight}>
            <Text style={styles.bidBannerLabel}>LEADING FRANCHISE</Text>
            {leadingTeam ? (
              <View style={[styles.teamPill, { borderColor: getTeamColor(leadingTeam) }]}>
                <View style={[styles.teamDot, { backgroundColor: getTeamColor(leadingTeam) }]} />
                <Text style={styles.teamPillText}>{leadingTeam}</Text>
              </View>
            ) : (
              <Text style={styles.noBidText}>AWAITING OPENING BID</Text>
            )}
          </View>
        </View>
      )}

      {/* Controls: If Auctioneer show Hammer Controls, otherwise show Bidding Paddle */}
      {user?.role === 'auctioneer' ? (
        <HammerControls />
      ) : (
        <BiddingPaddle onOpenLogin={onOpenLogin} />
      )}

      {/* Real-time Bid History Stream for current lot */}
      <View style={styles.historyBox}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>LOT BID STREAM</Text>
          <Text style={styles.historyCount}>{history.length} BIDS</Text>
        </View>

        {history.length === 0 ? (
          <Text style={styles.noHistoryText}>No bids registered for this player yet.</Text>
        ) : (
          history.slice(0, 5).map((item, idx) => (
            <View key={idx} style={[styles.historyRow, idx === 0 && styles.historyRowLeading]}>
              <View style={styles.historyLeft}>
                <View style={[styles.historyDot, { backgroundColor: getTeamColor(item.teamId) }]} />
                <Text style={styles.historyTeam}>{item.teamName || item.teamId}</Text>
                {idx === 0 && <Text style={styles.leaderBadge}>HIGH</Text>}
              </View>
              <Text style={styles.historyAmount}>{formatPrice(item.amount)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  arenaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  stageCol: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  tagLive: {
    backgroundColor: Colors.crimson,
  },
  tagPaused: {
    backgroundColor: Colors.paused,
  },
  tagIdle: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roundText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionTitle: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
  },
  resolutionBanner: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: 2,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  soldBanner: {
    backgroundColor: 'rgba(46, 125, 50, 0.25)',
    borderColor: '#2E7D32',
  },
  unsoldBanner: {
    backgroundColor: 'rgba(161, 61, 59, 0.25)',
    borderColor: Colors.crimson,
  },
  resolutionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bidFlash: {
    backgroundColor: '#302619',
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: 2,
    marginVertical: 4,
    alignItems: 'center',
  },
  flashText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  bidBanner: {
    flexDirection: 'row',
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  bidBannerLeft: {
    flex: 1,
  },
  bidBannerRight: {
    alignItems: 'flex-end',
  },
  bidBannerLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bidBannerAmount: {
    color: Colors.gold,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  teamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    gap: 6,
    marginTop: 2,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamPillText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  noBidText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
    marginBottom: 8,
  },
  historyTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyCount: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  noHistoryText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1A15',
  },
  historyRowLeading: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyTeam: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  leaderBadge: {
    backgroundColor: Colors.goldDark,
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  historyAmount: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
