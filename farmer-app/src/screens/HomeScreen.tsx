import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Hello, Farmer!</Text>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Farm Status</Text>
          <Text style={styles.summaryText}>🐄 3 Animals in your care</Text>
          <Text style={styles.summaryText}>💉 1 Vaccination due</Text>
          <Text style={styles.summaryText}>✅ 0 Pending Vet cases</Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]}>
            <Ionicons name="scan-circle" size={28} color="#FFF" />
            <Text style={styles.primaryBtnText}>Screen an Animal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="medical" size={28} color="#3B82F6" />
            <Text style={styles.actionBtnText}>Nearby Vet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 24,
  },
  quickActions: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    minHeight: 80,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  actionBtnText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  }
});
