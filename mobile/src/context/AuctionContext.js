import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../services/api';
import { SocketService } from '../services/socket';
import { Platform } from 'react-native';

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

  // Load initial configuration and state
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { serverUrl: url } = await ApiService.init();
        if (isMounted) setServerUrlState(url);

        // Fetch current auth session if token exists
        try {
          const authData = await ApiService.getMe();
          if (isMounted && authData?.user) {
            setUser(authData.user);
            setTeam(authData.team || null);
          }
        } catch (_) {}

        // Connect Socket.IO
        SocketService.connect();

        // Fetch initial data snapshot
        const [stateRes, playersRes, teamsRes] = await Promise.allSettled([
          ApiService.getState(),
          ApiService.getPlayers(),
          ApiService.getTeams()
        ]);

        if (isMounted) {
          if (stateRes.status === 'fulfilled' && stateRes.value) {
            setAuction(stateRes.value);
            setTimer(stateRes.value.timer ?? 15);
            setMaxTimer(stateRes.value.maxTimer ?? 15);
            if (stateRes.value.player) setCurrentPlayer(stateRes.value.player);
          }
          if (playersRes.status === 'fulfilled' && Array.isArray(playersRes.value)) {
            setPlayers(playersRes.value);
          }
          if (teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value)) {
            setTeams(teamsRes.value);
          }
        }
      } catch (err) {
        console.warn('Init error in AuctionContext:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    // Listen to Socket.IO events
    const unsubConn = SocketService.on('connection:change', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubState = SocketService.on('auction:state', (newState) => {
      if (!newState) return;
      setAuction(newState);
      if (newState.timer != null) setTimer(newState.timer);
      if (newState.maxTimer != null) setMaxTimer(newState.maxTimer);
      if (newState.player) setCurrentPlayer(newState.player);
      if (newState.teams && Array.isArray(newState.teams)) setTeams(newState.teams);
    });

    const unsubTimer = SocketService.on('auction:timer', (timerData) => {
      if (!timerData) return;
      if (timerData.timer != null) setTimer(timerData.timer);
      if (timerData.maxTimer != null) setMaxTimer(timerData.maxTimer);
    });

    const unsubBid = SocketService.on('auction:bid', (bidData) => {
      if (!bidData) return;
      setRecentBidNotice(bidData);
      setTimeout(() => setRecentBidNotice(null), 3000);
    });

    const unsubTeams = SocketService.on('teams:update', (updatedTeams) => {
      if (Array.isArray(updatedTeams)) {
        setTeams(updatedTeams);
      }
    });

    const unsubEvent = SocketService.on('auction:event', (newEvent) => {
      if (newEvent) {
        setEvents(prev => [newEvent, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      isMounted = false;
      unsubConn();
      unsubState();
      unsubTimer();
      unsubBid();
      unsubTeams();
      unsubEvent();
    };
  }, []);

  // Sync team whenever teams array or user changes
  useEffect(() => {
    if (user && user.teamId && teams.length > 0) {
      const cleanId = String(user.teamId).toUpperCase();
      const myTeam = teams.find(t => String(t.id).toUpperCase() === cleanId || String(t.code).toUpperCase() === cleanId);
      if (myTeam) setTeam(myTeam);
    }
  }, [user, teams]);

  // Auth methods
  const login = async (username, password) => {
    const data = await ApiService.login(username, password);
    setUser(data.user);
    setTeam(data.team);
    SocketService.authenticate(data.token);
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
    // Refresh state
    try {
      const [s, p, t] = await Promise.all([
        ApiService.getState(),
        ApiService.getPlayers(),
        ApiService.getTeams()
      ]);
      setAuction(s);
      setPlayers(p);
      setTeams(t);
      if (s.player) setCurrentPlayer(s.player);
    } catch (_) {}
  };

  // Bid Action
  const placeBid = async (expectedBid) => {
    return SocketService.placeBid(expectedBid);
  };

  // Auctioneer Actions
  const startLot = async (playerId) => {
    return ApiService.startAuction(playerId);
  };

  const gavelCall = async (stage) => {
    return ApiService.gavel(stage);
  };

  const markSold = async () => {
    return ApiService.sold();
  };

  const markUnsold = async () => {
    return ApiService.unsold();
  };

  const togglePause = async () => {
    if (auction.status === 'paused') {
      return ApiService.resume();
    }
    return ApiService.pause();
  };

  const addTime = async (seconds = 10) => {
    return ApiService.addTimer(seconds);
  };

  const resetClock = async () => {
    return ApiService.resetTimer();
  };

  const retainCaptains = async () => {
    return ApiService.retainCaptains();
  };

  const resetAll = async () => {
    return ApiService.resetAuction();
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
        login,
        logout,
        updateServerUrl,
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
