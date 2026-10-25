import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { formatPrice, getRoleBadge, getTeamColor } from '../utils/formatters';

export default function SquadsScreen() {
  const { teams } = useAuction();
  const [expandedTeam, setExpandedTeam] = useState(null);

  const toggleExpand = (teamId) => {
    setExpandedTeam(prev => prev === teamId ? null : teamId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>IPL FRANCHISE SQUADS & PURSES</Text>
        <Text style={styles.sub}>Official BCCI Financial Roster Compliance (10 Franchises)</Text>
      </View>

      {teams.map(t => {
        const teamColor = getTeamColor(t.id || t.code);
        const squad = t.squad || t.players || [];
        const isExpanded = expandedTeam === (t.id || t.code);
        const remaining = t.remaining ?? (t.purse - (t.spent || 0));
        const spent = t.spent ?? 0;
        const overseas = squad.filter(p => p.overseas).length;

        return (
          <View key={t.id || t.code} style={styles.teamCard}>
            <TouchableOpacity
              style={styles.teamHeader}
              onPress={() => toggleExpand(t.id || t.code)}
              activeOpacity={0.7}
            >
              <View style={[styles.teamIndicator, { backgroundColor: teamColor }]} />
              <View style={styles.teamTitleBox}>
                <Text style={styles.teamName}>{t.name} ({t.code || t.id})</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.slotsMeta}>
                    SLOTS: {squad.length} / {t.maxSlots || 15}
                  </Text>
                  <Text style={styles.overseasMeta}>
                    OVERSEAS: {overseas} / 8
                  </Text>
                </View>
              </View>

              <View style={styles.purseBox}>
                <Text style={styles.purseLabel}>REMAINING</Text>
                <Text style={styles.purseVal}>{formatPrice(remaining)}</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {/* Expanded Squad Ledger */}
            {isExpanded && (
              <View style={styles.squadList}>
                <View style={styles.squadHeader}>
                  <Text style={styles.squadHeaderTitle}>ACQUIRED SQUAD ROSTER ({squad.length})</Text>
                  <Text style={styles.spentMeta}>SPENT: {formatPrice(spent)}</Text>
                </View>

                {squad.length === 0 ? (
                  <Text style={styles.noPlayersText}>No cricketers acquired yet.</Text>
                ) : (
                  squad.map((p, idx) => {
                    const role = getRoleBadge(p.role);
                    return (
                      <View key={p.id || idx} style={styles.squadRow}>
                        <View style={styles.squadRowLeft}>
                          <Text style={styles.squadIdx}>#{idx + 1}</Text>
                          <Text style={styles.squadPName}>{p.name || p.displayName}</Text>
                          <View style={[styles.miniRole, { borderColor: role.color }]}>
                            <Text style={[styles.miniRoleText, { color: role.color }]}>{role.label}</Text>
                          </View>
                          {p.overseas && <Text style={styles.osTag}>✈️</Text>}
                        </View>
                        <Text style={styles.squadPrice}>{formatPrice(p.soldPrice || p.price)}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}
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
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  teamCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  teamIndicator: {
    width: 6,
    height: 40,
    borderRadius: 2,
    marginRight: 10,
  },
  teamTitleBox: {
    flex: 1,
  },
  teamName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },
  slotsMeta: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  overseasMeta: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  purseBox: {
    alignItems: 'flex-end',
  },
  purseLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  purseVal: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  expandIcon: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  squadList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#161310',
    padding: 10,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#251F19',
    marginBottom: 6,
  },
  squadHeaderTitle: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  spentMeta: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  noPlayersText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  squadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1A15',
  },
  squadRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  squadIdx: {
    color: Colors.textMuted,
    fontSize: 9,
    width: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  squadPName: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  miniRole: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  miniRoleText: {
    fontSize: 7,
    fontWeight: '800',
  },
  osTag: {
    fontSize: 9,
  },
  squadPrice: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
