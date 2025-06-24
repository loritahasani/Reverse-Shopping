// app/auth.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from './firebase';

const AuthScreen = () => {
    const router = useRouter(); // <-- përdor useRouter hook këtu

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const handleForgotPassword = () => {
        if (!email) {
            Alert.alert('Gabim', 'Ju lutem shkruani email-in tuaj për të rivendosur fjalëkalimin');
            return;
        }
        Alert.alert('Rivendosje e fjalëkalimit', `Një email për rivendosjen e fjalëkalimit do të dërgohet tek ${email}`);
    };

    const handleAuth = async () => {
        if (!email) {
            Alert.alert('Gabim', 'Ju lutem plotësoni email');
            return;
        }
        if (!password) {
            Alert.alert('Gabim', 'Ju lutem shkruani fjalëkalimin.');
            return;
        }
        if (!isLogin && (!firstName || !lastName)) {
            Alert.alert('Gabim', 'Ju lutem plotësoni emrin dhe mbiemrin');
            return;
        }

        setIsLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                Alert.alert('Sukses', 'Ju jeni kyçur me sukses!');
                router.replace('./profile'); // Direct navigation to profile page
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                Alert.alert('Sukses', 'Llogaria u krijua me sukses!');
                router.replace('./profile'); // Direct navigation to profile page
            }
        } catch (error: any) {
            let errorMessage = 'Ndodhi një gabim. Ju lutem provoni përsëri.';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Ky email është tashmë në përdorim.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email i pavlefshëm.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Përdoruesi nuk ekziston.';
                    break;
                case 'auth/wrong-password':
                    Alert.alert(
                        'Fjalëkalimi i gabuar',
                        'Keni harruar fjalekalimin?',
                        [
                            { text: 'Jo', style: 'cancel' },
                            { text: 'Po, rivendos fjalekalimin', onPress: () => handleForgotPassword() }
                        ]
                    );
                    return;
            }

            Alert.alert('Gabim', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.innerContainer}>
                <Ionicons name="person-circle-outline" size={80} color="#007AFF" style={styles.icon} />
                <Text style={styles.title}>{isLogin ? 'Kyçu në Llogarinë Tënde' : 'Krijo një Llogari të Re'}</Text>

                {!isLogin && (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Emri"
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Mbiemri"
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                        />
                    </>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Fjalëkalimi"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.authButton, isLoading && styles.disabledButton]}
                    onPress={handleAuth}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Text style={styles.authButtonText}>Duke u procesuar...</Text>
                    ) : (
                        <Text style={styles.authButtonText}>
                            {isLogin ? 'Kyçu' : 'Regjistrohu'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                    <Text style={styles.toggleText}>
                        {isLogin ? 'Nuk ke llogari? Regjistrohu' : 'Ke llogari? Kyçu'}
                    </Text>
                </TouchableOpacity>

                {isLogin && (
                    <TouchableOpacity onPress={handleForgotPassword}>
                        <Text style={styles.forgotPasswordText}>
                            Keni harruar fjalëkalimin?
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    icon: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    authButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#cccccc',
    },
    authButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    toggleText: {
        color: '#007AFF',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    forgotPasswordText: {
        color: '#007AFF',
        textAlign: 'center',
        marginTop: 15,
        fontSize: 14,
    },
});

// Export the AuthScreen component directly as the default export
export default AuthScreen;
