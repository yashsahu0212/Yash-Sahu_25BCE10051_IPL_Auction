/**
 * HAMMER Formatters & Utilities
 */

export function formatPrice(lakhs) {
  if (lakhs == null || isNaN(lakhs)) return '₹0';
  const val = Number(lakhs);
  if (val >= 100) {
    const cr = (val / 100).toFixed(2).replace(/\.00$/, '');
    return `₹${cr} Cr`;
  }
  return `₹${val} Lakhs`;
}

export function formatPriceShort(lakhs) {
  if (lakhs == null || isNaN(lakhs)) return '₹0';
  const val = Number(lakhs);
  if (val >= 100) {
    return `₹${(val / 100).toFixed(2).replace(/\.00$/, '')}Cr`;
  }
  return `₹${val}L`;
}

export function getRoleBadge(role) {
  switch (String(role).toLowerCase()) {
    case 'batter':
      return { label: 'BATTER', icon: '🏏', color: '#3B82F6' };
    case 'bowler':
      return { label: 'BOWLER', icon: '⚡', color: '#10B981' };
    case 'allrounder':
      return { label: 'ALL-ROUNDER', icon: '🌐', color: '#F59E0B' };
    case 'wicketkeeper':
      return { label: 'WICKETKEEPER', icon: '🧤', color: '#8B5CF6' };
    default:
      return { label: 'CRICKETER', icon: '🏏', color: '#6B7280' };
  }
}

export function getTeamColor(teamId) {
  const colors = {
    CSK: '#FFFF00',
    MI: '#004BA0',
    RCB: '#EC1C24',
    DC: '#0078BC',
    GT: '#1B2133',
    KKR: '#3A225D',
    LSG: '#A72056',
    PBKS: '#ED1B24',
    RR: '#EA1A85',
    SRH: '#F26522'
  };
  return colors[String(teamId).toUpperCase()] || '#D4AF37';
}
