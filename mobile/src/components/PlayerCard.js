import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';
import { formatPrice, getRoleBadge } from '../utils/formatters';

export default function PlayerCard({ player, status, serverUrl }) {
  if (!player) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>⚖️</Text>
        <Text style={styles.emptyTitle}>NO ACTIVE LOT</Text>
        <Text style={styles.emptySub}>Awaiting Auctioneer to call next player</Text>
      </View>
    );
  }

  const role = getRoleBadge(player.role);
  const stats = typeof player.stats === 'string' ? JSON.parse(player.stats || '{}') : (player.stats || {});
  
  // Resolve image URL
  let imageUrl = player.image || player.imageUrl;
  if (imageUrl && !imageUrl.startsWith('http')) {
    const base = serverUrl || 'http://192.168.1.7:3000';
    imageUrl = `${base}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  return (
    <View style={styles.card}>
      {/* Top Ledger Strip */}
      <View style={styles.topStrip}>
        <View style={styles.lotBadge}>
          <Text style={styles.lotText}>LOT #{player.lotNumber || player.id}</Text>
        </View>
        <View style={styles.setTag}>
          <Text style={styles.setText}>{player.set || 'SET 1 — MARQUEE'}</Text>
        </View>
        <View style={styles.baseTag}>
          <Text style={styles.baseLabel}>BASE: </Text>
          <Text style={styles.baseVal}>{formatPrice(player.basePrice)}</Text>
        </View>
      </View>

      {/* Main Player Profile */}
      <View style={styles.mainProfile}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.playerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{role.icon}</Text>
            </View>
          )}
          {player.overseas && (
            <View style={styles.overseasTag}>
              <Text style={styles.overseasText}>✈️ OVERSEAS</Text>
            </View>
          )}
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name || player.displayName}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: role.color + '22', borderColor: role.color }]}>
              <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
            </View>
            <Text style={styles.countryText}>{player.nationality || 'INDIA'}</Text>
          </View>

          {player.tacticalProfile ? (
            <Text style={styles.tacticalText} numberOfLines={2}>
              "{player.tacticalProfile}"
            </Text>
          ) : null}
        </View>
      </View>

      {/* Career Statistics Ledger */}
      <View style={styles.statsLedger}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.matches ?? stats.mat ?? 0}</Text>
          <Text style={styles.statLbl}>MAT</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.runs ?? 0}</Text>
          <Text style={styles.statLbl}>RUNS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.strikeRate ?? stats.sr ?? '-'}</Text>
          <Text style={styles.statLbl}>S/R</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.wickets ?? stats.wkts ?? 0}</Text>
          <Text style={styles.statLbl}>WKTS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.economy ?? stats.econ ?? '-'}</Text>
          <Text style={styles.statLbl}>ECON</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161310',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lotBadge: {
    backgroundColor: Colors.goldDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  lotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  setTag: {
    flex: 1,
    paddingHorizontal: 8,
  },
  setText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  baseTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  baseLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  baseVal: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  mainProfile: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  playerImage: {
    width: 80,
    height: 90,
    borderRadius: 2,
    backgroundColor: '#1E1914',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 90,
    borderRadius: 2,
    backgroundColor: '#1E1914',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 32,
  },
  overseasTag: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(22, 19, 16, 0.9)',
    paddingVertical: 1,
    alignItems: 'center',
  },
  overseasText: {
    color: Colors.textSecondary,
    fontSize: 7,
    fontWeight: '800',
  },
  bioContainer: {
    flex: 1,
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  countryText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tacticalText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 14,
  },
  statsLedger: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#1A1612',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statLbl: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
    minHeight: 180,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  }
});
