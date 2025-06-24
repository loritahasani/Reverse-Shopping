import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/tabs";
import React from 'react';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#007AFF",
                tabBarInactiveTintColor: "#8E8E93",
                tabBarStyle: {
                    backgroundColor: "#fff",
                    paddingBottom: 5,
                    height: 60,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Shtepia",
                    headerTitle: "Reverse Shopping",
                    headerLeft: () => (
                        <Ionicons
                            name="fast-food-outline"
                            size={24}
                            color="#000"
                            style={{ marginLeft: 10 }}
                        />
                    ),
                    headerRight: () => (
                        <Ionicons name="home-outline" size={24} color="#000" style={{ marginRight: 10 }} />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-recipes"
                options={{
                    title: "Recetat e Ruajtura",
                    headerTitle: "Reverse Shopping",
                    headerLeft: () => (
                        <Ionicons
                            name="fast-food-outline"
                            size={24}
                            color="#000"
                            style={{ marginLeft: 10 }}
                        />
                    ),
                    headerRight: () => (
                        <Ionicons name="book-outline" size={24} color="#000" style={{ marginRight: 10 }} />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profili",
                    headerTitle: "Reverse Shopping",
                    headerLeft: () => (
                        <Ionicons
                            name="fast-food-outline"
                            size={24}
                            color="#000"
                            style={{ marginLeft: 10 }}
                        />
                    ),
                    headerRight: () => (
                        <Ionicons name="person-outline" size={24} color="#000" style={{ marginRight: 10 }} />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
            

            <Tabs.Screen name="auth" options={{ href: null }} />
            <Tabs.Screen name="layout" options={{ href: null }} />
        </Tabs>
    );
}