import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { formatPrice, getRoleBadge, getTeamColor } from '../utils/formatters';

export default function PlayerPoolScreen() {
  const { players, serverUrl } = useAuction();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const filteredPlayers = players.filter(p => {
    // Search match
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchRole = p.role && p.role.toLowerCase().includes(q);
      if (!matchName && !matchRole) return false;
    }

    // Role filter
    if (roleFilter === 'BATTER' && p.role !== 'batter') return false;
    if (roleFilter === 'BOWLER' && p.role !== 'bowler') return false;
    if (roleFilter === 'ALLROUNDER' && p.role !== 'allrounder') return false;
    if (roleFilter === 'WK' && p.role !== 'wicketkeeper') return false;
    if (roleFilter === 'OVERSEAS' && !p.overseas) return false;

    // Status filter
    if (statusFilter === 'AVAILABLE' && p.status && p.status !== 'available') return false;
    if (statusFilter === 'SOLD' && p.status !== 'sold') return false;
    if (statusFilter === 'UNSOLD' && p.status !== 'unsold') return false;

    return true;
  });

  const renderItem = ({ item }) => {
    const role = getRoleBadge(item.role);
    const isSold = item.status === 'sold';
    const isUnsold = item.status === 'unsold';

    let imageUrl = item.image || item.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      const base = serverUrl || 'http://192.168.1.7:3000';
      imageUrl = `${base}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    return (
      <TouchableOpacity
        style={styles.playerCard}
        onPress={() => setSelectedPlayer(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.lotText}>LOT #{item.lotNumber || item.id}</Text>
          <View style={[
            styles.statusTag,
            isSold ? styles.tagSold : isUnsold ? styles.tagUnsold : styles.tagAvailable
          ]}>
            <Text style={styles.statusTagText}>
              {isSold ? `SOLD (${item.soldTo || 'FRANCHISE'})` : isUnsold ? 'UNSOLD' : 'AVAILABLE'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ fontSize: 20 }}>{role.icon}</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.playerName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { borderColor: role.color }]}>
                <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
              </View>
              {item.overseas && <Text style={styles.overseasTag}>OVERSEAS</Text>}
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.baseLabel}>
                {isSold ? 'SOLD PRICE: ' : 'RESERVE: '}
              </Text>
              <Text style={isSold ? styles.soldPrice : styles.basePrice}>
                {isSold ? formatPrice(item.soldPrice) : formatPrice(item.basePrice)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search 73 IPL cricketers by name..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role Filter Chips */}
      <View style={styles.filterRow}>
        {['ALL', 'BATTER', 'BOWLER', 'ALLROUNDER', 'WK', 'OVERSEAS'].map(rf => (
          <TouchableOpacity
            key={rf}
            style={[styles.filterChip, roleFilter === rf && styles.filterChipActive]}
            onPress={() => setRoleFilter(rf)}
          >
            <Text style={[styles.filterText, roleFilter === rf && styles.filterTextActive]}>
              {rf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter Row */}
      <View style={styles.statusFilterRow}>
        <Text style={styles.statusFilterCount}>{filteredPlayers.length} PLAYERS</Text>
        <View style={styles.statusChips}>
          {['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD'].map(sf => (
            <TouchableOpacity
              key={sf}
              style={[styles.miniChip, statusFilter === sf && styles.miniChipActive]}
              onPress={() => setStatusFilter(sf)}
            >
              <Text style={[styles.miniText, statusFilter === sf && styles.miniTextActive]}>
                {sf}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Player List */}
      <FlatList
        data={filteredPlayers}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      {/* Detailed Player Modal Dossier */}
      {selectedPlayer && (
        <Modal
          visible={!!selectedPlayer}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPlayer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>OFFICIAL DOSSIER</Text>
                <TouchableOpacity onPress={() => setSelectedPlayer(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalPlayerName}>{selectedPlayer.name}</Text>
              <Text style={styles.modalRole}>
                LOT #{selectedPlayer.lotNumber || selectedPlayer.id} • {(selectedPlayer.role || '').toUpperCase()}
              </Text>

              {/* Stats Grid */}
              <View style={styles.modalStats}>
                {(() => {
                  const s = typeof selectedPlayer.stats === 'string'
                    ? JSON.parse(selectedPlayer.stats || '{}')
                    : (selectedPlayer.stats || {});
                  return (
                    <>
                      <View style={styles.modalStatCol}>
                        <Text style={styles.modalStatVal}>{s.matches ?? s.mat ?? 0}</Text>
                        <Text style={styles.modalStatLbl}>MATCHES</Text>
                      </View>
                      <View style={styles.modalStatCol}>
                        <Text style={styles.modalStatVal}>{s.runs ?? 0}</Text>
                        <Text style={styles.modalStatLbl}>RUNS</Text>
                      </View>
                      <View style={styles.modalStatCol}>
                        <Text style={styles.modalStatVal}>{s.strikeRate ?? s.sr ?? '-'}</Text>
                        <Text style={styles.modalStatLbl}>STRIKE RATE</Text>
                      </View>
                      <View style={styles.modalStatCol}>
                        <Text style={styles.modalStatVal}>{s.wickets ?? s.wkts ?? 0}</Text>
                        <Text style={styles.modalStatLbl}>WICKETS</Text>
                      </View>
                      <View style={styles.modalStatCol}>
                        <Text style={styles.modalStatVal}>{s.economy ?? s.econ ?? '-'}</Text>
                        <Text style={styles.modalStatLbl}>ECONOMY</Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              {selectedPlayer.tacticalProfile && (
                <View style={styles.tacticalBox}>
                  <Text style={styles.tacticalLabel}>SCOUTING NOTES</Text>
                  <Text style={styles.tacticalNotes}>"{selectedPlayer.tacticalProfile}"</Text>
                </View>
              )}

              <View style={styles.modalFooter}>
                <Text style={styles.modalPriceLabel}>
                  {selectedPlayer.status === 'sold' ? 'SOLD PRICE' : 'BASE RESERVE'}
                </Text>
                <Text style={styles.modalPriceVal}>
                  {selectedPlayer.status === 'sold'
                    ? `${formatPrice(selectedPlayer.soldPrice)} (${selectedPlayer.soldTo})`
                    : formatPrice(selectedPlayer.basePrice)}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#161310',
  },
  filterChipActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  filterTextActive: {
    color: Colors.textInverse,
  },
  statusFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#14110E',
  },
  statusFilterCount: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  statusChips: {
    flexDirection: 'row',
    gap: 4,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  miniChipActive: {
    backgroundColor: Colors.surfaceHigh,
  },
  miniText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  miniTextActive: {
    color: Colors.gold,
  },
  listContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  playerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161310',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lotText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagSold: {
    backgroundColor: Colors.goldDark,
  },
  tagUnsold: {
    backgroundColor: '#4A2A2B',
  },
  tagAvailable: {
    backgroundColor: '#1B3B22',
  },
  statusTagText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  cardBody: {
    flexDirection: 'row',
    padding: 10,
    gap: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 50,
    height: 55,
    borderRadius: 2,
    backgroundColor: '#1E1914',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbPlaceholder: {
    width: 50,
    height: 55,
    borderRadius: 2,
    backgroundColor: '#1E1914',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInfo: {
    flex: 1,
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '800',
  },
  overseasTag: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  baseLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  basePrice: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  soldPrice: {
    color: '#81C784',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.goldMuted,
    borderRadius: 2,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
    marginBottom: 10,
  },
  modalTitle: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalClose: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  modalPlayerName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  modalRole: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatVal: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalStatLbl: {
    color: Colors.textMuted,
    fontSize: 7,
    fontWeight: '800',
    marginTop: 2,
  },
  tacticalBox: {
    backgroundColor: Colors.surfaceHigh,
    padding: 10,
    borderRadius: 2,
    marginBottom: 12,
  },
  tacticalLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  tacticalNotes: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  modalPriceLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  modalPriceVal: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '900',
  }
});
