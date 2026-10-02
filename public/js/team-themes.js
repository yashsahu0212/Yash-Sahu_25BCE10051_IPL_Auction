/**
 * HAMMER — Authoritative Centralized Team Identity & Theme System
 * One canonical source of truth for franchise colors, logos, and visual treatment.
 */
(function(window) {
  'use strict';

  const TEAMS_METADATA = {
    CSK: {
      id: 'CSK',
      shortName: 'CSK',
      fullName: 'Chennai Super Kings',
      name: 'CHENNAI SUPER KINGS',
      logo: '/teams/csk/logo.svg',
      logoSvg: '/teams/csk/logo.svg',
      logoPng: '/teams/csk/logo.png',
      primary: '#F9CD05',
      primary_color: '#F9CD05',
      secondary: '#004C97',
      secondary_color: '#004C97',
      accent: '#F36F21',
      accent_color: '#F36F21',
      text: '#0B0C0D', // Dark on bright yellow
      text_color: '#0B0C0D',
      contrastText: '#F9CD05', // Text when displayed against dark background
      badgeBg: 'rgba(249, 205, 5, 0.14)',
      badgeBorder: '#F9CD05',
      badgeText: '#F9CD05',
      glow: 'rgba(249, 205, 5, 0.3)'
    },
    DC: {
      id: 'DC',
      shortName: 'DC',
      fullName: 'Delhi Capitals',
      name: 'DELHI CAPITALS',
      logo: '/teams/dc/logo.svg',
      logoSvg: '/teams/dc/logo.svg',
      logoPng: '/teams/dc/logo.png',
      primary: '#004C97',
      primary_color: '#004C97',
      secondary: '#DC002B',
      secondary_color: '#DC002B',
      accent: '#F8AC18',
      accent_color: '#F8AC18',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#2B83E2',
      badgeBg: 'rgba(0, 76, 151, 0.18)',
      badgeBorder: '#004C97',
      badgeText: '#4A9EF8',
      glow: 'rgba(0, 76, 151, 0.3)'
    },
    GT: {
      id: 'GT',
      shortName: 'GT',
      fullName: 'Gujarat Titans',
      name: 'GUJARAT TITANS',
      logo: '/teams/gt/logo.svg',
      logoSvg: '/teams/gt/logo.svg',
      logoPng: '/teams/gt/logo.png',
      primary: '#1C2841',
      primary_color: '#1C2841',
      secondary: '#CCA347',
      secondary_color: '#CCA347',
      accent: '#E2B342',
      accent_color: '#E2B342',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#CCA347',
      badgeBg: 'rgba(204, 163, 71, 0.15)',
      badgeBorder: '#CCA347',
      badgeText: '#CCA347',
      glow: 'rgba(204, 163, 71, 0.3)'
    },
    KKR: {
      id: 'KKR',
      shortName: 'KKR',
      fullName: 'Kolkata Knight Riders',
      name: 'KOLKATA KNIGHT RIDERS',
      logo: '/teams/kkr/logo.svg',
      logoSvg: '/teams/kkr/logo.svg',
      logoPng: '/teams/kkr/logo.png',
      primary: '#3A225D',
      primary_color: '#3A225D',
      secondary: '#D4AF37',
      secondary_color: '#D4AF37',
      accent: '#8A4CB5',
      accent_color: '#8A4CB5',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#B985F8',
      badgeBg: 'rgba(58, 34, 93, 0.3)',
      badgeBorder: '#8A4CB5',
      badgeText: '#CCA347',
      glow: 'rgba(138, 76, 181, 0.3)'
    },
    LSG: {
      id: 'LSG',
      shortName: 'LSG',
      fullName: 'Lucknow Super Giants',
      name: 'LUCKNOW SUPER GIANTS',
      logo: '/teams/lsg/logo.svg',
      logoSvg: '/teams/lsg/logo.svg',
      logoPng: '/teams/lsg/logo.png',
      primary: '#0057E7',
      primary_color: '#0057E7',
      secondary: '#FF5E00',
      secondary_color: '#FF5E00',
      accent: '#00C2CB',
      accent_color: '#00C2CB',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#00C2CB',
      badgeBg: 'rgba(0, 87, 231, 0.16)',
      badgeBorder: '#0057E7',
      badgeText: '#00C2CB',
      glow: 'rgba(0, 194, 203, 0.3)'
    },
    MI: {
      id: 'MI',
      shortName: 'MI',
      fullName: 'Mumbai Indians',
      name: 'MUMBAI INDIANS',
      logo: '/teams/mi/logo.svg',
      logoSvg: '/teams/mi/logo.svg',
      logoPng: '/teams/mi/logo.png',
      primary: '#004BA0',
      primary_color: '#004BA0',
      secondary: '#D4AF37',
      secondary_color: '#D4AF37',
      accent: '#00A3E0',
      accent_color: '#00A3E0',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#29B6F6',
      badgeBg: 'rgba(0, 75, 160, 0.2)',
      badgeBorder: '#004BA0',
      badgeText: '#29B6F6',
      glow: 'rgba(0, 163, 224, 0.3)'
    },
    PBKS: {
      id: 'PBKS',
      shortName: 'PBKS',
      fullName: 'Punjab Kings',
      name: 'PUNJAB KINGS',
      logo: '/teams/pbks/logo.svg',
      logoSvg: '/teams/pbks/logo.svg',
      logoPng: '/teams/pbks/logo.png',
      primary: '#DD1F2D',
      primary_color: '#DD1F2D',
      secondary: '#D4AF37',
      secondary_color: '#D4AF37',
      accent: '#FF4D5A',
      accent_color: '#FF4D5A',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#FF4D5A',
      badgeBg: 'rgba(221, 31, 45, 0.16)',
      badgeBorder: '#DD1F2D',
      badgeText: '#FF4D5A',
      glow: 'rgba(221, 31, 45, 0.3)'
    },
    RR: {
      id: 'RR',
      shortName: 'RR',
      fullName: 'Rajasthan Royals',
      name: 'RAJASTHAN ROYALS',
      logo: '/teams/rr/logo.svg',
      logoSvg: '/teams/rr/logo.svg',
      logoPng: '/teams/rr/logo.png',
      primary: '#EA1B85',
      primary_color: '#EA1B85',
      secondary: '#004C97',
      secondary_color: '#004C97',
      accent: '#FF5CA8',
      accent_color: '#FF5CA8',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#FF5CA8',
      badgeBg: 'rgba(234, 27, 133, 0.16)',
      badgeBorder: '#EA1B85',
      badgeText: '#FF5CA8',
      glow: 'rgba(234, 27, 133, 0.3)'
    },
    RCB: {
      id: 'RCB',
      shortName: 'RCB',
      fullName: 'Royal Challengers Bengaluru',
      name: 'ROYAL CHALLENGERS BENGALURU',
      logo: '/teams/rcb/logo.svg',
      logoSvg: '/teams/rcb/logo.svg',
      logoPng: '/teams/rcb/logo.png',
      primary: '#C74632',
      primary_color: '#C74632',
      secondary: '#0B0C0D',
      secondary_color: '#0B0C0D',
      accent: '#CCA347',
      accent_color: '#CCA347',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#E65640',
      badgeBg: 'rgba(199, 70, 50, 0.18)',
      badgeBorder: '#C74632',
      badgeText: '#E65640',
      glow: 'rgba(199, 70, 50, 0.3)'
    },
    SRH: {
      id: 'SRH',
      shortName: 'SRH',
      fullName: 'Sunrisers Hyderabad',
      name: 'SUNRISERS HYDERABAD',
      logo: '/teams/srh/logo.svg',
      logoSvg: '/teams/srh/logo.svg',
      logoPng: '/teams/srh/logo.png',
      primary: '#FF822A',
      primary_color: '#FF822A',
      secondary: '#000000',
      secondary_color: '#000000',
      accent: '#FFA366',
      accent_color: '#FFA366',
      text: '#FFFFFF',
      text_color: '#FFFFFF',
      contrastText: '#FF822A',
      badgeBg: 'rgba(255, 130, 42, 0.16)',
      badgeBorder: '#FF822A',
      badgeText: '#FFA366',
      glow: 'rgba(255, 130, 42, 0.3)'
    }
  };

  // Aliases mapping for flexible lookups
  const ALIASES = {
    'chennai': 'CSK', 'chennai super kings': 'CSK', 'csk': 'CSK',
    'delhi': 'DC', 'delhi capitals': 'DC', 'dc': 'DC',
    'gujarat': 'GT', 'gujarat titans': 'GT', 'gt': 'GT',
    'kolkata': 'KKR', 'kolkata knight riders': 'KKR', 'kkr': 'KKR',
    'lucknow': 'LSG', 'lucknow super giants': 'LSG', 'lsg': 'LSG',
    'mumbai': 'MI', 'mumbai indians': 'MI', 'mi': 'MI',
    'punjab': 'PBKS', 'punjab kings': 'PBKS', 'pbks': 'PBKS',
    'rajasthan': 'RR', 'rajasthan royals': 'RR', 'rr': 'RR',
    'rcb': 'RCB', 'bengaluru': 'RCB', 'royal challengers': 'RCB', 'royal challengers bengaluru': 'RCB', 'royal challengers bangalore': 'RCB',
    'hyderabad': 'SRH', 'sunrisers': 'SRH', 'sunrisers hyderabad': 'SRH', 'srh': 'SRH'
  };

  const DEFAULT_THEME = {
    id: 'HAMMER',
    shortName: 'HAMMER',
    fullName: 'AUTHORITATIVE AUCTION',
    name: 'HAMMER OFFICIAL',
    logo: '/logos/hammer.svg',
    primary: '#C74632',
    primary_color: '#C74632',
    secondary: '#181A1C',
    secondary_color: '#181A1C',
    accent: '#CCA347',
    accent_color: '#CCA347',
    text: '#FFFFFF',
    text_color: '#FFFFFF',
    contrastText: '#F2F0EA',
    badgeBg: 'rgba(199, 70, 50, 0.12)',
    badgeBorder: '#C74632',
    badgeText: '#F2F0EA',
    glow: 'rgba(199, 70, 50, 0.25)'
  };

  /**
   * Universal function to get franchise theme by ID, code, or name
   * @param {string} teamId 
   * @returns {object} theme metadata
   */
  function getTeamTheme(teamId) {
    if (!teamId) return DEFAULT_THEME;
    const key = String(teamId).trim().toUpperCase();
    if (TEAMS_METADATA[key]) {
      return TEAMS_METADATA[key];
    }
    const cleanLower = String(teamId).trim().toLowerCase();
    if (ALIASES[cleanLower] && TEAMS_METADATA[ALIASES[cleanLower]]) {
      return TEAMS_METADATA[ALIASES[cleanLower]];
    }
    // Partial substring match
    for (const [alias, id] of Object.entries(ALIASES)) {
      if (cleanLower.includes(alias) || alias.includes(cleanLower)) {
        return TEAMS_METADATA[id];
      }
    }
    return { ...DEFAULT_THEME, id: key, shortName: key, fullName: key };
  }

  /**
   * Generate an inline team badge with logo and team identity color treatment
   * @param {string} teamId
   * @param {object} options { size: 'sm'|'md'|'lg', showFullName: boolean, customClass: string }
   */
  function renderTeamBadge(teamId, options = {}) {
    const theme = getTeamTheme(teamId);
    const size = options.size || 'md';
    const showFullName = options.showFullName || false;
    const customClass = options.customClass || '';

    let heightClass = 'h-7 px-2.5 text-xs';
    let logoSizeClass = 'w-4 h-4';
    if (size === 'sm') {
      heightClass = 'h-5 px-1.5 text-[10px]';
      logoSizeClass = 'w-3 h-3';
    } else if (size === 'lg') {
      heightClass = 'h-10 px-4 text-base';
      logoSizeClass = 'w-6 h-6';
    } else if (size === 'xl') {
      heightClass = 'h-12 px-5 text-xl';
      logoSizeClass = 'w-8 h-8';
    }

    const gapClass = size === 'sm' ? 'gap-1' : 'gap-2';

    return `
      <span class="inline-flex items-center ${gapClass} border font-mono uppercase font-bold tracking-wider rounded-[4px] select-none transition-all whitespace-nowrap shrink-0 ${heightClass} ${customClass}"
            style="background-color: ${theme.badgeBg}; border-color: ${theme.badgeBorder}; color: ${theme.contrastText}; box-shadow: 0 0 12px ${theme.badgeBg};"
            title="${theme.fullName}">
        <img src="${theme.logo}" alt="${theme.shortName}" class="${logoSizeClass} object-contain shrink-0" onerror="this.style.display='none'"/>
        <span class="badge-team-label shrink-0">${label}</span>
      </span>
    `.trim();
  }

  // Export to global scope
  window.HAMMER_TEAMS = TEAMS_METADATA;
  window.getTeamTheme = getTeamTheme;
  window.renderTeamBadge = renderTeamBadge;

  // Also hook into Hammer namespace if available
  if (window.Hammer) {
    window.Hammer.getTeamTheme = getTeamTheme;
    window.Hammer.renderTeamBadge = renderTeamBadge;
    window.Hammer.TEAMS_METADATA = TEAMS_METADATA;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      TEAMS_METADATA,
      getTeamTheme,
      renderTeamBadge
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
