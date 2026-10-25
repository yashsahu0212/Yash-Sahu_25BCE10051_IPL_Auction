import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';

export default function HammerControls() {
  const { auction, gavelCall, markSold, markUnsold, togglePause, addTime, resetClock } = useAuction();
  const [loadingAction, setLoadingAction] = useState(null);

  const isLive = auction.status === 'live';
  const isPaused = auction.status === 'paused';
  const hasBids = auction.currentBid > 0 && auction.leadingTeamId;

  const runAction = async (name, fn) => {
    setLoadingAction(name);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Action Failed', e.message || 'Error executing auction action');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AUCTIONEER GAVEL CONTROLS</Text>
        <TouchableOpacity
          style={[styles.pauseBtn, isPaused && styles.resumeBtn]}
          onPress={() => runAction('pause', togglePause)}
        >
          <Text style={styles.pauseText}>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Gavel Stage Progression */}
      <View style={styles.gavelRow}>
        <TouchableOpacity
          style={[styles.gavelBtn, auction.gavelStage === 1 && styles.gavelActive]}
          onPress={() => runAction('1st', () => gavelCall(1))}
        >
          <Text style={styles.gavelText}>1st CALL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gavelBtn, auction.gavelStage === 2 && styles.gavelActive]}
          onPress={() => runAction('2nd', () => gavelCall(2))}
        >
          <Text style={styles.gavelText}>2nd CALL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gavelBtn, auction.gavelStage === 3 && styles.gavelActive]}
          onPress={() => runAction('final', () => gavelCall(3))}
        >
          <Text style={styles.gavelText}>FAIR WARNING</Text>
        </TouchableOpacity>
      </View>

      {/* Hammer Resolution Buttons */}
      <View style={styles.resolutionRow}>
        <TouchableOpacity
          style={[styles.soldBtn, !hasBids && styles.btnDisabled]}
          disabled={!hasBids || !!loadingAction}
          onPress={() => runAction('sold', markSold)}
        >
          <Text style={styles.soldText}>🔨 HAMMER SOLD</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.unsoldBtn, !!loadingAction && styles.btnDisabled]}
          disabled={!!loadingAction}
          onPress={() => runAction('unsold', markUnsold)}
        >
          <Text style={styles.unsoldText}>PASS (UNSOLD)</Text>
        </TouchableOpacity>
      </View>

      {/* Clock Controls */}
      <View style={styles.clockRow}>
        <Text style={styles.clockLabel}>CLOCK:</Text>
        <TouchableOpacity style={styles.timeBtn} onPress={() => runAction('+5s', () => addTime(5))}>
          <Text style={styles.timeText}>+5s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timeBtn} onPress={() => runAction('+10s', () => addTime(10))}>
          <Text style={styles.timeText}>+10s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timeBtn} onPress={() => runAction('+15s', () => addTime(15))}>
          <Text style={styles.timeText}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timeBtn} onPress={() => runAction('reset', resetClock)}>
          <Text style={styles.timeText}>RESET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.goldMuted,
    padding: Spacing.md,
    borderRadius: 2,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pauseBtn: {
    backgroundColor: '#382D1E',
    borderWidth: 1,
    borderColor: Colors.paused,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  resumeBtn: {
    backgroundColor: '#1E3821',
    borderColor: '#10B981',
  },
  pauseText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  gavelRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  gavelBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 2,
  },
  gavelActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold,
  },
  gavelText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resolutionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  soldBtn: {
    flex: 2,
    backgroundColor: '#1B3B22',
    borderWidth: 1,
    borderColor: '#2E7D32',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 2,
  },
  soldText: {
    color: '#81C784',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unsoldBtn: {
    flex: 1,
    backgroundColor: '#3B1F20',
    borderWidth: 1,
    borderColor: Colors.crimsonMuted,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 2,
  },
  unsoldText: {
    color: '#E57373',
    fontSize: 10,
    fontWeight: '800',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clockLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginRight: 4,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 2,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.35,
  }
});
