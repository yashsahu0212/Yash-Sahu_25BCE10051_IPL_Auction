import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { formatPrice } from '../utils/formatters';
import HammerControls from '../components/HammerControls';

export default function AuctioneerScreen() {
  const { user, auction, players, startLot, retainCaptains, resetAll } = useAuction();
  const [search, setSearch] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isRetaining, setIsRetaining] = useState(false);

  if (user?.role !== 'auctioneer') {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>AUCTIONEER RESTRICTED AREA</Text>
        <Text style={styles.deniedSub}>You must be logged in as Auctioneer to access master gavel controls.</Text>
      </View>
    );
  }

  // Filter players available for next lot
  const availablePlayers = players.filter(p => {
    const isAvail = !p.status || p.status === 'available';
    if (!isAvail) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name && p.name.toLowerCase().includes(q)) || (p.role && p.role.toLowerCase().includes(q));
  });

  const handleStartLot = async (p) => {
    setIsStarting(true);
    try {
      await startLot(p.id);
      Alert.alert('Lot Started', `${p.name} is now LIVE on the hammer!`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not start lot');
    } finally {
      setIsStarting(false);
    }
  };

  const handleRetainCaptains = async () => {
    Alert.alert(
      'Confirm Retention',
      'Lock official 2026 franchise captains into rosters at base price (Kohli, Dhoni, Pandya, Cummins, etc.)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retain All',
          style: 'destructive',
          onPress: async () => {
            setIsRetaining(true);
            try {
              await retainCaptains();
              Alert.alert('Success', 'Official 2026 Captains locked into team rosters!');
            } catch (e) {
              Alert.alert('Error', e.message || 'Retention failed');
            } finally {
              setIsRetaining(false);
            }
          }
        }
      ]
    );
  };

  const handleReset = async () => {
    Alert.alert(
      'Reset Auction State',
      'Are you sure you want to reset current lot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAll();
              Alert.alert('Reset', 'Auction lot reset successfully.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>AUCTIONEER MASTER CONSOLE</Text>
        <Text style={styles.sub}>Official BCCI IPL Mega Auction Gavel Authority</Text>
      </View>

      {/* Active Lot Gavel Controls */}
      <HammerControls />

      {/* Special Engines Section */}
      <View style={styles.engineCard}>
        <Text style={styles.sectionTitle}>SPECIAL AUCTION ENGINES</Text>

        <TouchableOpacity
          style={[styles.actionBtn, styles.retainBtn]}
          onPress={handleRetainCaptains}
          disabled={isRetaining || auction.captainsRetained}
        >
          {isRetaining ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>
              {auction.captainsRetained ? '✓ CAPTAINS RETAINED (10/10)' : 'IPL 2026 CAPTAIN RETENTION ENGINE'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={handleReset}>
          <Text style={styles.resetBtnText}>EMERGENCY RESET CURRENT LOT</Text>
        </TouchableOpacity>
      </View>

      {/* Launch Next Player Section */}
      <View style={styles.launchCard}>
        <View style={styles.launchHeader}>
          <Text style={styles.sectionTitle}>PUT CRICKETER ON HAMMER</Text>
          <Text style={styles.countText}>{availablePlayers.length} AVAILABLE</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Filter available players by name or role..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.playerList}>
          {availablePlayers.slice(0, 15).map(p => (
            <View key={p.id} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.pName}>{p.name}</Text>
                <Text style={styles.pMeta}>
                  LOT #{p.lotNumber || p.id} • {(p.role || '').toUpperCase()} • {formatPrice(p.basePrice)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.launchBtn, isStarting && styles.btnDisabled]}
                disabled={isStarting}
                onPress={() => handleStartLot(p)}
              >
                <Text style={styles.launchBtnText}>CALL LOT</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  engineCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 2,
    marginVertical: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 2,
    marginBottom: 8,
  },
  retainBtn: {
    backgroundColor: Colors.goldMuted,
  },
  resetBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.crimsonMuted,
  },
  actionBtnText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resetBtnText: {
    color: Colors.crimson,
    fontSize: 10,
    fontWeight: '800',
  },
  launchCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 2,
    marginVertical: Spacing.sm,
  },
  launchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  countText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
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
    marginBottom: Spacing.sm,
  },
  playerList: {
    gap: 8,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerInfo: {
    flex: 1,
  },
  pName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  pMeta: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  launchBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  launchBtnText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deniedContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  deniedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  deniedTitle: {
    color: Colors.crimson,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  deniedSub: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.4,
  }
});
