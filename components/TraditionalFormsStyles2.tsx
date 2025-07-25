import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000000', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  placeholder: { width: 24 },
  scrollContainer: { flex: 1 },
  addSection: { alignItems: 'center', marginBottom: 16, marginTop: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  scoresSection: { backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000', marginBottom: 12 },
  loadingText: { color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  emptyText: { color: '#666', textAlign: 'center', padding: 20 }
});