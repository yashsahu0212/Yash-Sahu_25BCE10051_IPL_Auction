import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiService } from '../services/api';
import { SocketService } from '../services/socket';
let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (_) {}

function triggerHaptic(type = 'light') {
  try {
    if (Haptics && Platform.OS !== 'web') {
      if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(type === 'heavy' ? [50, 50, 50] : 30);
    }
  } catch (_) {}
}

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [auction, setAuction] = useState({
    status: 'idle',
    currentPlayerId: null,
    currentBid: 0,
    basePrice: 0,
    leadingTeamId: null,
    round: 1,
    lotIndex: 0,
    timer: 15,
    maxTimer: 15,
    gavelStage: 0,
    bidIncrement: 10,
    bidHistory: [],
    captainsRetained: false
  });
  const [timer, setTimer] = useState(15);
  const [maxTimer, setMaxTimer] = useState(15);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [recentBidNotice, setRecentBidNotice] = useState(null);
  const [resolutionNotice, setResolutionNotice] = useState(null);

  const playersRef = useRef([]);
  playersRef.current = players;
  const auctionRef = useRef(auction);
  auctionRef.current = auction;

  // Unified State Applier: Ensures zero-delay lockstep between mobile and web
  const applyState = useCallback((newState) => {
    if (!newState || typeof newState !== 'object') return;

    setAuction(prev => ({
      ...prev,
      ...newState,
      status: newState.status || prev.status,
      currentBid: newState.currentBid != null ? Number(newState.currentBid) : prev.currentBid,
      basePrice: newState.basePrice != null ? Number(newState.basePrice) : prev.basePrice,
      leadingTeamId: newState.leadingTeamId !== undefined ? newState.leadingTeamId : prev.leadingTeamId,
      bidHistory: Array.isArray(newState.bidHistory) ? newState.bidHistory : prev.bidHistory,
      timer: newState.timer != null ? Number(newState.timer) : prev.timer,
      maxTimer: newState.maxTimer != null ? Number(newState.maxTimer) : prev.maxTimer,
      gavelStage: newState.gavelStage != null ? Number(newState.gavelStage) : prev.gavelStage,
      lotIndex: newState.lotIndex != null ? newState.lotIndex : prev.lotIndex,
      round: newState.round != null ? newState.round : prev.round
    }));

    if (newState.timer != null) setTimer(Number(newState.timer));
    if (newState.maxTimer != null) setMaxTimer(Number(newState.maxTimer));

    // Resolve current player accurately
    const isLiveOrPaused = newState.status === 'live' || newState.status === 'paused';
    if (!isLiveOrPaused && (newState.status === 'idle' || (!newState.currentPlayer && !newState.currentPlayerId))) {
      setCurrentPlayer(null);
    } else {
      let resolvedPlayer = newState.currentPlayer || newState.player;
      if (!resolvedPlayer && newState.currentPlayerId) {
        resolvedPlayer = playersRef.current.find(p => String(p.id) === String(newState.currentPlayerId)) || null;
      }
      if (resolvedPlayer) {
        setCurrentPlayer(resolvedPlayer);
      }
    }

    if (newState.teams && Array.isArray(newState.teams)) {
      setTeams(newState.teams);
    }
  }, []);

  // Sync snapshot from REST API
  const syncSnapshot = useCallback(async () => {
    try {
      const [sRes, pRes, tRes] = await Promise.allSettled([
        ApiService.getState(),
        ApiService.getPlayers(),
        ApiService.getTeams()
      ]);

      if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
        setPlayers(pRes.value);
        playersRef.current = pRes.value;
      }
      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) {
        setTeams(tRes.value);
      }
      if (sRes.status === 'fulfilled' && sRes.value) {
        applyState(sRes.value);
      }
    } catch (e) {
      console.warn('Sync snapshot error:', e);
    }
  }, [applyState]);

  // Initial boot and background watchers
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { serverUrl: url } = await ApiService.init();
        if (isMounted) setServerUrlState(url);

        // Fetch auth session
        try {
          const authData = await ApiService.getMe();
          if (isMounted && authData?.user) {
            setUser(authData.user);
            setTeam(authData.team || null);
          }
        } catch (_) {}

        // Connect Socket.IO
        SocketService.connect();

        // Initial snapshot
        await syncSnapshot();
      } catch (err) {
        console.warn('Init error in AuctionContext:', err);
        // Try auto discovery if initial server URL fails
        try {
          const discovered = await ApiService.autoDiscoverServer();
          if (isMounted && discovered) {
            setServerUrlState(discovered);
            SocketService.disconnect();
            SocketService.connect();
            await syncSnapshot();
          }
        } catch (_) {}
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    // 1. Connection lifecycle listeners
    const unsubConn = SocketService.on('connection:change', ({ connected, isReconnect }) => {
      setIsConnected(connected);
      if (connected) {
        syncSnapshot();
      }
    });

    // 2. Realtime Auction State Stream
    const unsubState = SocketService.on('auction:state', (newState) => {
      if (newState) applyState(newState);
    });

    // 3. Lot started
    const unsubStarted = SocketService.on('auction:started', (startedState) => {
      triggerHaptic('heavy');
      if (startedState) applyState(startedState);
      setResolutionNotice(null);
    });

    // 4. Timer Ticks
    const unsubTimer = SocketService.on('auction:timer', (timerData) => {
      if (!timerData) return;
      if (timerData.timer != null) setTimer(Number(timerData.timer));
      if (timerData.maxTimer != null) setMaxTimer(Number(timerData.maxTimer));
      if (timerData.gavelStage != null) {
        setAuction(prev => ({ ...prev, gavelStage: Number(timerData.gavelStage) }));
      }
    });

    // 5. Bid Stream (INSTANT ZERO-DELAY UPDATE)
    const unsubBid = SocketService.on('auction:bid', (bidData) => {
      if (!bidData) return;
      triggerHaptic('medium');

      // Instantly apply state returned in bid payload
      if (bidData.state) {
        applyState(bidData.state);
      } else {
        setAuction(prev => ({
          ...prev,
          currentBid: bidData.amount != null ? Number(bidData.amount) : prev.currentBid,
          leadingTeamId: bidData.teamId || prev.leadingTeamId,
          bidHistory: Array.isArray(bidData.bidHistory) ? bidData.bidHistory : prev.bidHistory
        }));
      }

      setRecentBidNotice(bidData);
      setTimeout(() => setRecentBidNotice(null), 3500);
    });

    // 6. Lot Sold
    const unsubSold = SocketService.on('auction:sold', (soldData) => {
      triggerHaptic('heavy');
      if (soldData?.state) {
        applyState(soldData.state);
      } else {
        setAuction(prev => ({ ...prev, status: 'idle', currentPlayerId: null, currentBid: 0 }));
        setCurrentPlayer(null);
      }
      setResolutionNotice({
        type: 'SOLD',
        player: soldData.player,
        team: soldData.team,
        price: soldData.price
      });
      setTimeout(() => setResolutionNotice(null), 4000);
      syncSnapshot();
    });

    // 7. Lot Unsold
    const unsubUnsold = SocketService.on('auction:unsold', (unsoldData) => {
      triggerHaptic('medium');
      if (unsoldData?.state) {
        applyState(unsoldData.state);
      } else {
        setAuction(prev => ({ ...prev, status: 'idle', currentPlayerId: null, currentBid: 0 }));
        setCurrentPlayer(null);
      }
      setResolutionNotice({
        type: 'UNSOLD',
        player: unsoldData.player
      });
      setTimeout(() => setResolutionNotice(null), 4000);
      syncSnapshot();
    });

    // 8. Auction Paused / Resumed / Reset
    const unsubPaused = SocketService.on('auction:paused', (data) => {
      if (data) applyState(data);
      else setAuction(prev => ({ ...prev, status: 'paused' }));
    });

    const unsubResumed = SocketService.on('auction:resumed', (data) => {
      if (data) applyState(data);
      else setAuction(prev => ({ ...prev, status: 'live' }));
    });

    const unsubReset = SocketService.on('auction:reset', (data) => {
      if (data) applyState(data);
      else syncSnapshot();
    });

    // 9. Teams Update
    const unsubTeams = SocketService.on('teams:update', (updatedTeams) => {
      if (Array.isArray(updatedTeams)) {
        setTeams(updatedTeams);
      }
    });

    // 10. Audit Log Events
    const unsubEvent = SocketService.on('auction:event', (newEvent) => {
      if (newEvent) {
        setEvents(prev => [newEvent, ...prev.slice(0, 99)]);
      }
    });

    // 11. AppState Resilience: Resync on app foreground / wake
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (!SocketService.isConnected()) {
          SocketService.connect();
        }
        syncSnapshot();
      }
    });

    // 12. Watchdog Interval: Guarantees lockstep with server even over jittery mobile Wi-Fi
    const watchdogId = setInterval(() => {
      if (isMounted) {
        if (!SocketService.isConnected()) {
          SocketService.connect();
        }
        // Periodic background poll to verify lockstep
        ApiService.getState().then(s => {
          if (s && isMounted) applyState(s);
        }).catch(() => {});
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(watchdogId);
      appStateSubscription.remove();
      unsubConn();
      unsubState();
      unsubStarted();
      unsubTimer();
      unsubBid();
      unsubSold();
      unsubUnsold();
      unsubPaused();
      unsubResumed();
      unsubReset();
      unsubTeams();
      unsubEvent();
    };
  }, [applyState, syncSnapshot]);

  // Sync current user's team whenever teams array or user changes
  useEffect(() => {
    if (user && user.teamId && teams.length > 0) {
      const cleanId = String(user.teamId).trim().toUpperCase();
      const myTeam = teams.find(t =>
        String(t.id).trim().toUpperCase() === cleanId ||
        String(t.code || '').trim().toUpperCase() === cleanId
      );
      if (myTeam) setTeam(myTeam);
    }
  }, [user, teams]);

  // Auth methods
  const login = async (username, password) => {
    const data = await ApiService.login(username, password);
    setUser(data.user);
    setTeam(data.team);
    SocketService.authenticate(data.token);
    await syncSnapshot();
    return data;
  };

  const logout = async () => {
    await ApiService.logout();
    setUser(null);
    setTeam(null);
    SocketService.authenticate(null);
  };

  const updateServerUrl = async (newUrl) => {
    const clean = await ApiService.setServerUrl(newUrl);
    setServerUrlState(clean);
    SocketService.disconnect();
    SocketService.connect();
    await syncSnapshot();
  };

  // Bid Action (Low latency WebSocket with auto-fallback)
  const placeBid = async (expectedBid) => {
    triggerHaptic('medium');
    const result = await SocketService.placeBid(expectedBid);
    if (result && result.state) {
      applyState(result.state);
    }
    return result;
  };

  // Auctioneer Actions
  const startLot = async (playerId) => {
    const res = await ApiService.startAuction(playerId);
    if (res?.state) applyState(res.state);
    return res;
  };

  const gavelCall = async (stage) => {
    return ApiService.gavel(stage);
  };

  const markSold = async () => {
    const res = await ApiService.sold();
    if (res?.state) applyState(res.state);
    return res;
  };

  const markUnsold = async () => {
    const res = await ApiService.unsold();
    if (res?.state) applyState(res.state);
    return res;
  };

  const togglePause = async () => {
    if (auction.status === 'paused') {
      const res = await ApiService.resume();
      if (res?.state) applyState(res.state);
      return res;
    }
    const res = await ApiService.pause();
    if (res?.state) applyState(res.state);
    return res;
  };

  const addTime = async (seconds = 10) => {
    return ApiService.addTimer(seconds);
  };

  const resetClock = async () => {
    return ApiService.resetTimer();
  };

  const retainCaptains = async () => {
    const res = await ApiService.retainCaptains();
    await syncSnapshot();
    return res;
  };

  const resetAll = async () => {
    const res = await ApiService.resetAuction();
    await syncSnapshot();
    return res;
  };

  return (
    <AuctionContext.Provider
      value={{
        user,
        team,
        auction,
        timer,
        maxTimer,
        currentPlayer,
        teams,
        players,
        events,
        isConnected,
        serverUrl,
        isLoading,
        recentBidNotice,
        resolutionNotice,
        login,
        logout,
        updateServerUrl,
        syncSnapshot,
        placeBid,
        startLot,
        gavelCall,
        markSold,
        markUnsold,
        togglePause,
        addTime,
        resetClock,
        retainCaptains,
        resetAll
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const ctx = useContext(AuctionContext);
  if (!ctx) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return ctx;
}
