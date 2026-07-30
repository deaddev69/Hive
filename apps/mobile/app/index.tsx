import React from 'react';
import { View, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function HomeScreen() {
  const products = useQuery(api.products.getActiveProducts, {});

  const count = Array.isArray(products)
    ? products.length
    : (products as any)?.page?.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111111', marginBottom: 12 }}>
          Hive Mobile 🛍️
        </Text>
        
        {products === undefined ? (
          <ActivityIndicator size="large" color="#000000" />
        ) : (
          <Text style={{ fontSize: 16, color: '#4B5563', textAlign: 'center' }}>
            Connected to Convex! ({count} active products)
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
