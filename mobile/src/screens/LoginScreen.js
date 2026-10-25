import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { useAuction } from '../context/AuctionContext';
import { getTeamColor } from '../utils/formatters';

const PRESET_ACCOUNTS = [
  { label: 'AUCTIONEER', username: 'auctioneer', password: 'hammer2026', icon: '🔨', color: '#D4AF37' },
  { label: 'CSK (Chennai)', username: 'csk', password: 'csk2026', icon: '🦁', color: '#FFFF00' },
  { label: 'MI (Mumbai)', username: 'mi', password: 'mi2026', icon: '🌀', color: '#004BA0' },
  { label: 'RCB (Bengaluru)', username: 'rcb', password: 'rcb2026', icon: '👑', color: '#EC1C24' },
  { label: 'SRH (Hyderabad)', username: 'srh', password: 'srh2026', icon: '🦅', color: '#F26522' },
  { label: 'KKR (Kolkata)', username: 'kkr', password: 'kkr2026', icon: '⚔️', color: '#3A225D' },
  { label: 'DC (Delhi)', username: 'dc', password: 'dc2026', icon: '🐯', color: '#0078BC' },
  { label: 'GT (Gujarat)', username: 'gt', password: 'gt2026', icon: '⚡', color: '#1B2133' },
  { label: 'RR (Rajasthan)', username: 'rr', password: 'rr2026', icon: '🛡️', color: '#EA1A85' },
  { label: 'LSG (Lucknow)', username: 'lsg', password: 'lsg2026', icon: '🌟', color: '#A72056' },
  { label: 'PBKS (Punjab)', username: 'pbks', password: 'pbks2026', icon: '🦁', color: '#ED1B24' },
  { label: 'VIEWER (Fan)', username: 'viewer', password: 'view2026', icon: '👁️', color: '#6B7280' },
];

export default function LoginScreen({ onClose }) {
  const { login, serverUrl, updateServerUrl, isConnected } = useAuction();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveUrl = async () => {
    try {
      await updateServerUrl(urlInput);
      Alert.alert('Server Configured', `Connected to ${urlInput}`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not connect to server');
    }
  };

  const handleQuickLogin = async (acc) => {
    setIsLoading(true);
    try {
      await login(acc.username, acc.password);
      if (onClose) onClose();
    } catch (e) {
      Alert.alert('Login Failed', e.message || 'Check connection to auction server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async () => {
    if (!username || !password) {
      return Alert.alert('Missing Fields', 'Please enter both username and password.');
    }
    setIsLoading(true);
    try {
      await login(username, password);
      if (onClose) onClose();
    } catch (e) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials or server unreachable');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>HAMMER AUCTION PORTAL</Text>
        <Text style={styles.sub}>Connect Mobile App to Realtime Server</Text>
      </View>

      {/* Server URL Config */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SERVER NETWORK ADDRESS</Text>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
        </View>
        <View style={styles.urlRow}>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://172.25.241.119:3000"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.urlSaveBtn} onPress={handleSaveUrl}>
            <Text style={styles.urlSaveText}>SAVE</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.urlHelp}>
          Use your PC's Wi-Fi IP (e.g. http://172.25.241.119:3000) when running on physical phone.
        </Text>
      </View>

      {/* One-Tap Fast Role Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1-TAP QUICK FRANCHISE LOGIN</Text>
        <View style={styles.grid}>
          {PRESET_ACCOUNTS.map(acc => (
            <TouchableOpacity
              key={acc.username}
              style={[styles.presetCard, { borderColor: acc.color + '66' }]}
              onPress={() => handleQuickLogin(acc)}
              disabled={isLoading}
            >
              <Text style={styles.presetIcon}>{acc.icon}</Text>
              <Text style={styles.presetLabel} numberOfLines={1}>{acc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Manual Login */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CUSTOM CREDENTIALS</Text>
        <TextInput
          style={styles.input}
          placeholder="Username (e.g. csk, mi, auctioneer)"
          placeholderTextColor={Colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleManualLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.loginBtnText}>SIGN IN</Text>
          )}
        </TouchableOpacity>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>RETURN TO AUCTION</Text>
        </TouchableOpacity>
      )}
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
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  title: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 2,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  urlSaveBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.goldMuted,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 2,
  },
  urlSaveText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  urlHelp: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 6,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetCard: {
    width: '31%',
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 2,
  },
  presetIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  presetLabel: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#161310',
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 2,
    fontSize: 12,
    marginBottom: 8,
  },
  loginBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 2,
    marginTop: 4,
  },
  loginBtnText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
});
