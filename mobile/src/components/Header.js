import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';

export default function Header({ onOpenSettings }) {
  const { isConnected, user, team, logout } = useAuction();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>HAMMER</Text>
        <TouchableOpacity style={styles.statusPill} onPress={onOpenSettings} activeOpacity={0.7}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.statusText}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
          <Text style={styles.settingsMiniIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        {user ? (
          <View style={styles.userBadge}>
            <TouchableOpacity style={styles.roleTag} onPress={onOpenSettings} activeOpacity={0.7}>
              <Text style={styles.roleText}>
                {user.role === 'auctioneer' ? 'AUCTIONEER' : (team?.code || user.username).toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>EXIT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={onOpenSettings}>
            <Text style={styles.loginBtnText}>CONNECT</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161310',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingsMiniIcon: {
    fontSize: 9,
    marginLeft: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.goldMuted,
  },
  roleText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.crimsonMuted,
  },
  logoutText: {
    color: Colors.crimson,
    fontSize: 10,
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 2,
  },
  loginBtnText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
});
