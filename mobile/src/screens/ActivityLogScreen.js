import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { ApiService } from '../services/api';
import { formatPrice, getTeamColor } from '../utils/formatters';

export default function ActivityLogScreen() {
  const { events, user } = useAuction();
  const [initialEvents, setInitialEvents] = useState([]);

  useEffect(() => {
    // Only attempt to fetch initial activity if auctioneer or viewer (protected on server)
    if (user?.role === 'auctioneer') {
      ApiService.getActivity().then(data => {
        if (Array.isArray(data)) setInitialEvents(data);
      }).catch(() => {});
    }
  }, [user]);

  // Combine real-time socket events with initial loaded ones
  const allEvents = [...events, ...initialEvents].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

  const getEventBadge = (type) => {
    switch (type) {
      case 'LOT_OPENED':
        return { label: 'LOT OPENED', color: '#3B82F6' };
      case 'BID_PLACED':
        return { label: 'BID PLACED', color: Colors.gold };
      case 'LOT_SOLD':
        return { label: 'HAMMER SOLD', color: '#10B981' };
      case 'LOT_UNSOLD':
        return { label: 'UNSOLD', color: Colors.crimson };
      case 'CAPTAIN_RETAINED':
        return { label: 'CAPTAIN RETAINED', color: '#8B5CF6' };
      case 'TIMER_ADJUSTED':
        return { label: 'CLOCK ADJUSTED', color: Colors.paused };
      default:
        return { label: type || 'EVENT', color: Colors.textMuted };
    }
  };

  const renderItem = ({ item }) => {
    const badge = getEventBadge(item.event_type);
    const team = item.actor_team_id || item.actor_team_name;
    const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '';

    return (
      <View style={styles.eventRow}>
        <View style={styles.eventTop}>
          <View style={[styles.badge, { backgroundColor: badge.color + '22', borderColor: badge.color }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={styles.seqText}>#{item.event_sequence || '—'} • {timeStr}</Text>
        </View>

        <View style={styles.eventBody}>
          <Text style={styles.eventTitle}>
            {item.player_name ? item.player_name : 'Auction Session'}
          </Text>

          {item.amount_lakh > 0 && (
            <Text style={styles.eventAmount}>{formatPrice(item.amount_lakh)}</Text>
          )}
        </View>

        {team ? (
          <View style={styles.teamTag}>
            <View style={[styles.teamDot, { backgroundColor: getTeamColor(team) }]} />
            <Text style={styles.teamText}>{team}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LIVE AUDIT ACTIVITY STREAM</Text>
        <Text style={styles.sub}>Authoritative sequential BCCI auction log</Text>
      </View>

      <FlatList
        data={allEvents}
        keyExtractor={(item, idx) => item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Waiting for live auction events...</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  listContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  eventRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    borderRadius: 2,
    marginBottom: 6,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seqText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  eventBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  eventAmount: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  }
});
