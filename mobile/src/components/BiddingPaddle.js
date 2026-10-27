import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors, Spacing } from '../theme';
import { formatPrice, formatPriceShort } from '../utils/formatters';
import { useAuction } from '../context/AuctionContext';

export default function BiddingPaddle({ onOpenLogin }) {
  const { user, team, auction, timer, placeBid } = useAuction();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is not logged in as a team owner
  if (!user || user.role !== 'team_owner' || !team) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestTitle}>FRANCHISE BIDDING CONSOLE</Text>
        <Text style={styles.guestSub}>Log in with your IPL franchise credentials to participate in live bidding.</Text>
        <TouchableOpacity style={styles.guestBtn} onPress={onOpenLogin}>
          <Text style={styles.guestBtnText}>LOG IN AS FRANCHISE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLive = auction.status === 'live';
  const isPaused = auction.status === 'paused';
  const isTimerExpired = timer === 0;

  // Determine current high bid and next minimum bid
  const currentBid = Number(auction.currentBid || 0);
  const basePrice = Number(auction.basePrice || 200);

  // Tiered increments: < 100L -> +10L, < 500L -> +20L, >= 500L -> +50L
  let increment = 10;
  if (currentBid >= 500) increment = 50;
  else if (currentBid >= 100) increment = 20;

  let nextBid = 0;
  if (!currentBid || currentBid === 0 || !auction.leadingTeamId) {
    nextBid = basePrice;
  } else {
    nextBid = currentBid + increment;
  }

  // Check Rule 7: Cannot bid against yourself
  const isLeading = auction.leadingTeamId && String(auction.leadingTeamId).toUpperCase() === String(team.id || team.code).toUpperCase();

  // Check Purse and Roster
  const remainingPurse = team.remaining ?? (team.purse - (team.spent || 0));
  const hasPurse = remainingPurse >= nextBid;
  const isRosterFull = (team.filledSlots || (team.squad?.length || 0)) >= (team.maxSlots || 15);

  const canBid = isLive && !isPaused && !isTimerExpired && !isLeading && hasPurse && !isRosterFull && !isSubmitting;

  const handleBidPress = async (targetBid = nextBid) => {
    if (!canBid) return;
    setIsSubmitting(true);
    try {
      await placeBid(targetBid);
    } catch (err) {
      Alert.alert('Bid Rejected', err.message || 'Unable to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Franchise Purse Bar */}
      <View style={styles.purseBar}>
        <View style={styles.purseItem}>
          <Text style={styles.purseLabel}>PURSE REMAINING</Text>
          <Text style={styles.purseVal}>{formatPrice(remainingPurse)}</Text>
        </View>
        <View style={styles.purseDivider} />
        <View style={styles.purseItem}>
          <Text style={styles.purseLabel}>ROSTER SLOTS</Text>
          <Text style={styles.purseVal}>
            {team.filledSlots || (team.squad?.length || 0)} / {team.maxSlots || 15}
          </Text>
        </View>
      </View>

      {/* Status Warning or Banner */}
      {isLeading ? (
        <View style={styles.leadingBanner}>
          <Text style={styles.leadingBannerText}>🏆 {team.name} HOLDS LEADING BID</Text>
          <Text style={styles.leadingSub}>Rule 7: Franchise cannot raise against itself</Text>
        </View>
      ) : isTimerExpired ? (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>BIDDING FROZEN (CLOCK EXPIRED)</Text>
        </View>
      ) : isPaused ? (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>AUCTION PAUSED BY AUCTIONEER</Text>
        </View>
      ) : !hasPurse ? (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>INSUFFICIENT PURSE FOR NEXT BID</Text>
        </View>
      ) : isRosterFull ? (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>MAXIMUM SQUAD CAPACITY REACHED (15/15)</Text>
        </View>
      ) : null}

      {/* Tiered Increment Badge */}
      <View style={styles.tierIndicatorBar}>
        <View style={styles.tierTag}>
          <Text style={styles.tierTagText}>RULE 6 TIER INCREMENT</Text>
        </View>
        <Text style={styles.tierValText}>+{increment} LAKHS</Text>
      </View>

      {/* Main Big Tactical Bid Button */}
      <TouchableOpacity
        style={[styles.mainPaddle, !canBid && styles.paddleDisabled]}
        onPress={() => handleBidPress(nextBid)}
        disabled={!canBid}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#161310" size="small" />
        ) : (
          <View style={styles.paddleContent}>
            <Text style={styles.paddleAction}>RAISE BID PADDLE</Text>
            <Text style={styles.paddlePrice}>{formatPrice(nextBid)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 2,
    marginVertical: Spacing.sm,
  },
  purseBar: {
    flexDirection: 'row',
    backgroundColor: '#161310',
    padding: Spacing.sm,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  purseItem: {
    flex: 1,
    alignItems: 'center',
  },
  purseDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  purseLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  purseVal: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  leadingBanner: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderRadius: 2,
  },
  leadingBannerText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leadingSub: {
    color: Colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  expiredBanner: {
    backgroundColor: 'rgba(161, 61, 59, 0.15)',
    borderWidth: 1,
    borderColor: Colors.crimson,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderRadius: 2,
  },
  expiredText: {
    color: Colors.crimson,
    fontSize: 10,
    fontWeight: '800',
  },
  pausedBanner: {
    backgroundColor: 'rgba(212, 136, 6, 0.15)',
    borderWidth: 1,
    borderColor: Colors.paused,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderRadius: 2,
  },
  pausedText: {
    color: Colors.paused,
    fontSize: 10,
    fontWeight: '800',
  },
  tierIndicatorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  tierTag: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  tierTagText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierValText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mainPaddle: {
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E8C17C',
  },
  paddleDisabled: {
    backgroundColor: '#352F28',
    borderColor: '#4A3E30',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  paddleContent: {
    alignItems: 'center',
  },
  paddleAction: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  paddlePrice: {
    color: Colors.textInverse,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  guestContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  guestTitle: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  guestSub: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 8,
  },
  guestBtn: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
  },
  guestBtnText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
  }
});
