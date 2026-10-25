import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { AuctionProvider, useAuction } from './src/context/AuctionContext';
import { Colors } from './src/theme';
import Header from './src/components/Header';
import LiveArenaScreen from './src/screens/LiveArenaScreen';
import AuctioneerScreen from './src/screens/AuctioneerScreen';
import PlayerPoolScreen from './src/screens/PlayerPoolScreen';
import SquadsScreen from './src/screens/SquadsScreen';
import ActivityLogScreen from './src/screens/ActivityLogScreen';
import LoginScreen from './src/screens/LoginScreen';

function MainNavigator() {
  const [activeTab, setActiveTab] = useState('ARENA'); // 'ARENA' | 'GAVEL' | 'POOL' | 'SQUADS' | 'LOG'
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuction();

  const isAuctioneer = user?.role === 'auctioneer';

  const renderScreen = () => {
    if (showLoginModal) {
      return <LoginScreen onClose={() => setShowLoginModal(false)} />;
    }

    switch (activeTab) {
      case 'ARENA':
        return (
          <LiveArenaScreen
            onOpenLogin={() => setShowLoginModal(true)}
            onOpenPlayerPool={() => setActiveTab('POOL')}
          />
        );
      case 'GAVEL':
        return <AuctioneerScreen />;
      case 'POOL':
        return <PlayerPoolScreen />;
      case 'SQUADS':
        return <SquadsScreen />;
      case 'LOG':
        return <ActivityLogScreen />;
      default:
        return <LiveArenaScreen onOpenLogin={() => setShowLoginModal(true)} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#161310" />
      <Header onOpenSettings={() => setShowLoginModal(true)} />

      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation Tab Bar */}
      {!showLoginModal && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'ARENA' && styles.tabActive]}
            onPress={() => setActiveTab('ARENA')}
          >
            <Text style={styles.tabIcon}>⚡</Text>
            <Text style={[styles.tabLabel, activeTab === 'ARENA' && styles.tabLabelActive]}>
              ARENA
            </Text>
          </TouchableOpacity>

          {isAuctioneer && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'GAVEL' && styles.tabActive]}
              onPress={() => setActiveTab('GAVEL')}
            >
              <Text style={styles.tabIcon}>🔨</Text>
              <Text style={[styles.tabLabel, activeTab === 'GAVEL' && styles.tabLabelActive]}>
                GAVEL
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'POOL' && styles.tabActive]}
            onPress={() => setActiveTab('POOL')}
          >
            <Text style={styles.tabIcon}>🏏</Text>
            <Text style={[styles.tabLabel, activeTab === 'POOL' && styles.tabLabelActive]}>
              PLAYERS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'SQUADS' && styles.tabActive]}
            onPress={() => setActiveTab('SQUADS')}
          >
            <Text style={styles.tabIcon}>🛡️</Text>
            <Text style={[styles.tabLabel, activeTab === 'SQUADS' && styles.tabLabelActive]}>
              SQUADS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'LOG' && styles.tabActive]}
            onPress={() => setActiveTab('LOG')}
          >
            <Text style={styles.tabIcon}>📜</Text>
            <Text style={[styles.tabLabel, activeTab === 'LOG' && styles.tabLabelActive]}>
              AUDIT
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuctionProvider>
      <MainNavigator />
    </AuctionProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#161310',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  tabBar: {
    height: 58,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.gold,
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.gold,
  }
});
