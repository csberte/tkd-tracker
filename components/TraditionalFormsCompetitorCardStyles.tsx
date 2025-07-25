import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16, // Proper horizontal margin to prevent edge clipping
    marginVertical: 8, // Vertical spacing between cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  compactCard: {
    paddingVertical: 12,
  },
  tieBreakerIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  rankSection: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  medalContainer: {
    marginBottom: 4,
  },
  rankEmoji: {
    fontSize: 20,
  },
  podiumEmoji: {
    fontSize: 24,
  },
  rankRow: {
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  podiumRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  avatarSection: {
    marginRight: 12,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tieBreakerStatus: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 4,
  },
  scorePointsBlock: {
    marginTop: 4,
  },
  compactScoreBlock: {
    marginTop: 2,
  },
  rightAlignedScoreRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  medalistScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pointsColumn: {
    alignItems: 'center',
    minWidth: 60,
  },
  scoreColumn: {
    alignItems: 'center',
    minWidth: 60,
  },
  stackedLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 12,
  },
  columnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 2,
  },
  actionSection: {
    width: 30,
    alignItems: 'center',
  },
});