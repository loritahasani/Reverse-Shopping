import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from './firebase';
import { Recipe, recipeImageMap } from './index';

const getRecipeImageSource = (recipe: Recipe) => {
  if (recipe.name && recipeImageMap[recipe.name]) {
    return recipeImageMap[recipe.name];
  }
  else if (recipe.image && typeof recipe.image === 'string' && recipeImageMap[recipe.image]) {
    return recipeImageMap[recipe.image];
  }
  else if (typeof recipe.image === 'number') {
    return recipe.image;
  }
  else if (recipe.image && typeof recipe.image === 'object' && 'uri' in recipe.image) {
    return recipe.image;
  }
  else {
    return require("../assets/images/recipedd.jpg");
  }
};

const { width, height } = Dimensions.get('window');
const isMobile = width < 600;
const isTablet = width >= 600 && width < 1000;

const SAVED_RECIPES_KEY = '@saved_recipes';
const SAVED_MEAL_PLANS_KEY = '@saved_meal_plans';

const albanianDays = {
  Monday: 'E Hënë',
  Tuesday: 'E Martë',
  Wednesday: 'E Mërkurë',
  Thursday: 'E Enjte',
  Friday: 'E Premte',
  Saturday: 'E Shtunë',
  Sunday: 'E Diel'
};

const englishDays = {
  'E Hënë': 'Monday',
  'E Martë': 'Tuesday',
  'E Mërkurë': 'Wednesday',
  'E Enjte': 'Thursday',
  'E Premte': 'Friday',
  'E Shtunë': 'Saturday',
  'E Diel': 'Sunday'
};

export default function MyRecipesScreen() {
    const router = useRouter();
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [savedMealPlans, setSavedMealPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
    const [viewingMealPlan, setViewingMealPlan] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'recipes' | 'mealPlans'>('recipes');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    const getApiBaseUrl = () => {
        return 'https://reverse-shopping-hiq9.onrender.com';
    };

    const loadSavedData = useCallback(async () => {
        setIsLoading(true);
        setViewingRecipe(null);
        setViewingMealPlan(null);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setSavedRecipes([]);
            setSavedMealPlans([]);
            setIsLoading(false);
            return;
        }
        
        try {
            // Load saved recipes
            const storedRecipes = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`);
            let localRecipes: Recipe[] = [];
            
            if (storedRecipes) {
                const savedRecipesData = JSON.parse(storedRecipes);
                if (savedRecipesData.length > 0 && typeof savedRecipesData[0] === 'object') {
                    localRecipes = savedRecipesData;
                    setSavedRecipes(localRecipes);
                }
            }
            
            // Try to fetch from backend API
            try {
                const response = await axios.get(`${getApiBaseUrl()}/saved-recipes`);
                
                if (response.data && Array.isArray(response.data)) {
                    const validRecipes = response.data.filter((item: any) => {
                        return item && item.name && item.recipeId;
                    });
                    
                    const backendRecipes = validRecipes.map((item: any) => ({
                        id: item.recipeId,
                        _id: item._id,
                        name: item.name,
                        ingredients: item.perberesit || [],
                        instructions: item.instructions,
                        image: getRecipeImageSource({ name: item.name, image: item.image } as Recipe)
                    }));
                    
                    const mergedRecipes = [...backendRecipes];
                    
                    localRecipes.forEach(localRecipe => {
                        if (localRecipe && localRecipe.id && localRecipe.name && 
                            !mergedRecipes.some(r => r.id === localRecipe.id)) {
                            mergedRecipes.push({
                                ...localRecipe,
                                _id: localRecipe._id || localRecipe.id
                            });
                        }
                    });
                    
                    setSavedRecipes(mergedRecipes);
                    if (currentUser) {
                        await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`, JSON.stringify(mergedRecipes));
                    }
                }
            } catch (apiError) {
                console.error('Failed to fetch saved recipes from API:', apiError);
            }

            // Load saved meal plans
            const storedMealPlans = await AsyncStorage.getItem(`${SAVED_MEAL_PLANS_KEY}_${currentUser.uid}`);
            if (storedMealPlans) {
                const parsedMealPlans = JSON.parse(storedMealPlans);
                // Convert English day names to Albanian for display
                const validatedMealPlans = parsedMealPlans.map((plan: any) => {
                    const convertedPlan: any = {};
                    if (plan.plan) {
                        Object.keys(plan.plan).forEach(day => {
                            const albanianDay = albanianDays[day as keyof typeof albanianDays] || day;
                            convertedPlan[albanianDay] = plan.plan[day];
                        });
                    }
                    return {
                        ...plan,
                        plan: convertedPlan,
                        name: plan.name || 'Plan i padeklaruar'
                    };
                });
                setSavedMealPlans(validatedMealPlans);
            }

        } catch (e) {
            console.error("Failed to load saved data", e);
            setSavedRecipes([]);
            setSavedMealPlans([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setIsAuthenticated(!!user);
            
            if (!user) {
                setSavedRecipes([]);
                setSavedMealPlans([]);
                
                Alert.alert(
                    'Regjistrohu ose Kyçu', 
                    'Ju lutemi regjistrohuni ose kyçuni për të parë recetat dhe planet e ruajtura.',
                    [
                        { 
                            text: 'Anulo', 
                            style: 'cancel',
                            onPress: () => router.replace('./')
                        },
                        { 
                            text: 'Shko te Kyçja', 
                            onPress: () => router.push('./auth')
                        }
                    ]
                )
            }
        });
        
        return () => unsubscribe();
    }, [router]);
    
    useFocusEffect(
        React.useCallback(() => {
            loadSavedData();
            return () => { };
        }, [loadSavedData])
    );

    const handleUnsaveRecipe = async (recipe: Recipe) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            
            const storageKey = `${SAVED_RECIPES_KEY}_${currentUser.uid}`;
            const storedValue = await AsyncStorage.getItem(storageKey);
            let savedRecipesData = storedValue ? JSON.parse(storedValue) : [];

            const updatedRecipes = savedRecipesData.filter((r: Recipe) => r.id !== recipe.id);
            setSavedRecipes(updatedRecipes);

            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecipes));
            await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}_timestamp`, new Date().getTime().toString());
                
            if (recipe._id) {
                try {
                    await axios.delete(`${getApiBaseUrl()}/saved-recipes/${recipe._id}`);
                } catch (backendError) {
                    console.error('Failed to remove recipe from backend:', backendError);
                }
            }
            
            Alert.alert('Sukses', 'Receta u hoq nga të ruajturat');
        } catch (e) {
            console.error("Failed to unsave recipe", e);
            Alert.alert('Gabim', 'Ndodhi një gabim gjatë heqjes së recetës');
            loadSavedData();
        }
    };

    const handleUnsaveMealPlan = async (mealPlanId: string) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            
            const storageKey = `${SAVED_MEAL_PLANS_KEY}_${currentUser.uid}`;
            const storedValue = await AsyncStorage.getItem(storageKey);
            let savedMealPlansData = storedValue ? JSON.parse(storedValue) : [];

            const updatedMealPlans = savedMealPlansData.filter((mp: any) => mp.id !== mealPlanId);
            setSavedMealPlans(updatedMealPlans);

            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMealPlans));
            
            Alert.alert('Sukses', 'Plani u hoq');
        } catch (e) {
            console.error("Failed to unsave meal plan", e);
            Alert.alert('Gabim', 'Ndodhi një gabim gjatë heqjes së planit');
            loadSavedData();
        }
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('./');
        }
    };

    const handleShowRecipeDetails = (recipe: Recipe) => {
        setViewingRecipe(recipe);
        setViewingMealPlan(null);
    };

    const handleShowMealPlanDetails = (mealPlan: any) => {
        setViewingMealPlan(mealPlan);
        setViewingRecipe(null);
    };

    const handleBackToList = () => {
        setViewingRecipe(null);
        setViewingMealPlan(null);
    };

    const renderMealPlanCard = (mealPlan: any) => (
        <TouchableOpacity
            style={[styles.mealPlanCard, isTablet && styles.mealPlanCardTablet]}
            onPress={() => handleShowMealPlanDetails(mealPlan)}
            activeOpacity={0.8}
        >
            <ImageBackground
                source={require("../assets/images/recipedd.jpg")}
                style={styles.mealPlanImage}
                imageStyle={styles.imageStyle}
            >
                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleUnsaveMealPlan(mealPlan.id);
                    }}
                >
                    <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.imageOverlay}>
                    <Text style={styles.mealPlanName} numberOfLines={2}>{mealPlan.name}</Text>
                    <View style={styles.recipeFooter}>
                        <Text style={styles.viewRecipeText}>Shiko planin</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );

    const renderMealPlanDetail = () => {
        if (!viewingMealPlan) return null;
        
        const days = Object.keys(viewingMealPlan.plan || {});
        
        return (
            <ScrollView style={styles.detailScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.detailHeaderContainer}>
                    <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                        {viewingMealPlan.name}
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleUnsaveMealPlan(viewingMealPlan.id)}
                        style={styles.detailHeartButton}
                    >
                        <Ionicons name="trash-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.mealPlanDetailContainer}>
                    {days.map(day => (
                        <View key={day} style={styles.mealPlanDayContainer}>
                            <Text style={styles.mealPlanDayTitle}>{day}</Text>
                            
                            {viewingMealPlan.plan[day]?.breakfast && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].breakfast)}
                                >
                                    <Text style={styles.mealPlanMealType}>Mëngjesi:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].breakfast.name}</Text>
                                </TouchableOpacity>
                            )}
                            
                            {viewingMealPlan.plan[day]?.lunch && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].lunch)}
                                >
                                    <Text style={styles.mealPlanMealType}>Dreka:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].lunch.name}</Text>
                                </TouchableOpacity>
                            )}
                            
                            {viewingMealPlan.plan[day]?.dinner && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].dinner)}
                                >
                                    <Text style={styles.mealPlanMealType}>Darka:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].dinner.name}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    if (isLoading) {
        return (
            <ImageBackground source={require("../assets/images/back.jpg")} style={styles.background} resizeMode="cover">
                <View style={styles.backgroundOverlay} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Duke ngarkuar të dhënat...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground
            source={require("../assets/images/recipedd.jpg")}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.backgroundOverlay} />

            {viewingRecipe ? (
                <ScrollView style={styles.detailScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                    <View style={styles.detailHeaderContainer}>
                        <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                            {viewingRecipe.name}
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleUnsaveRecipe(viewingRecipe)}
                            style={styles.detailHeartButton}
                        >
                            <Ionicons name="trash-outline" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detailContentWrapper}>
                        <View style={styles.detailTopRowContainer}>
                            <View style={[styles.detailImageContainer, isTablet && styles.detailImageContainerTablet]}>
                                <Image
                                    source={getRecipeImageSource(viewingRecipe)}
                                    style={styles.detailImage}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={[styles.detailIngredientsContainer, isTablet && styles.detailIngredientsContainerTablet]}>
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Përbërësit</Text>
                                    {viewingRecipe.ingredients.map((ingredient, index) => (
                                        <View key={index} style={styles.ingredientItem}>
                                            <Ionicons name="ellipse" size={8} color="#007AFF" style={styles.ingredientIcon} />
                                            <Text style={styles.ingredientText}>{ingredient}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailInstructionsContainer}>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Udhëzimet</Text>
                                <Text style={styles.instructionsText}>
                                    {viewingRecipe.instructions}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            ) : viewingMealPlan ? (
                renderMealPlanDetail()
            ) : (
                <ScrollView style={styles.listScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                    <View style={styles.container}>
                        <View style={styles.detailHeaderContainer}>
                            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                                Recetat e mia
                            </Text>
                            <View style={styles.headerPlaceholderRight} />
                        </View>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'recipes' && styles.activeTab]}
                                onPress={() => setActiveTab('recipes')}
                            >
                                <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>Recetat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'mealPlans' && styles.activeTab]}
                                onPress={() => setActiveTab('mealPlans')}
                            >
                                <Text style={[styles.tabText, activeTab === 'mealPlans' && styles.activeTabText]}>Planet</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'recipes' ? (
                            savedRecipes.length === 0 ? (
                                <View style={styles.centeredEmpty}>
                                    <Ionicons name="archive-outline" size={60} color="#ccc" />
                                    <Text style={styles.noRecipesText}>Nuk keni receta të ruajtura</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={savedRecipes}
                                    keyExtractor={(item) => item.id}
                                    numColumns={isMobile ? 2 : (isTablet ? 3 : 4)}
                                    columnWrapperStyle={isMobile ? styles.columnWrapperMobile : (isTablet ? styles.columnWrapperTablet : styles.columnWrapper)}
                                    style={styles.flatListStyle}
                                    contentContainerStyle={styles.listContainerPadding}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.recipeCard, isTablet && styles.recipeCardTablet]}
                                            onPress={() => handleShowRecipeDetails(item)}
                                            activeOpacity={0.8}
                                        >
                                            <ImageBackground
                                                source={getRecipeImageSource(item)}
                                                style={styles.recipeImage}
                                                imageStyle={styles.imageStyle}
                                            >
                                                <TouchableOpacity
                                                    style={styles.heartButton}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleUnsaveRecipe(item);
                                                    }}
                                                >
                                                    <Ionicons name="trash-outline" size={24} color="white" />
                                                </TouchableOpacity>
                                                <View style={styles.imageOverlay}>
                                                    <Text style={styles.recipeName} numberOfLines={2}>{item.name}</Text>
                                                    <View style={styles.recipeFooter}>
                                                        <Text style={styles.viewRecipeText}>Shiko recetën</Text>
                                                        <Ionicons name="arrow-forward" size={16} color="white" />
                                                    </View>
                                                </View>
                                            </ImageBackground>
                                        </TouchableOpacity>
                                    )}
                                    key={isMobile ? 'mobile-columns' : (isTablet ? 'tablet-columns' : 'desktop-columns')}
                                />
                            )
                        ) : (
                            savedMealPlans.length === 0 ? (
                                <View style={styles.centeredEmpty}>
                                    <Ionicons name="calendar-outline" size={60} color="#ccc" />
                                    <Text style={styles.noRecipesText}>Nuk keni plane të ruajtura</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={savedMealPlans}
                                    keyExtractor={(item) => item.id}
                                    numColumns={isMobile ? 1 : (isTablet ? 2 : 2)}
                                    columnWrapperStyle={isMobile ? undefined : (isTablet ? styles.columnWrapperTablet : styles.columnWrapper)}
                                    style={styles.flatListStyle}
                                    contentContainerStyle={styles.listContainerPadding}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => renderMealPlanCard(item)}
                                />
                            )
                        )}
                    </View>
                </ScrollView>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, width: "100%" },
    backgroundOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: {
        marginTop: 15, fontSize: 16, color: '#333', backgroundColor: 'rgba(255,255,255,0.7)',
        paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5,
    },
    centeredEmpty: {
        flex: 1, width: '100%', paddingVertical: 80, alignItems: 'center', justifyContent: 'center',
        minHeight: height * 0.5,
    },
    noRecipesText: {
        fontSize: 18, color: '#444', textAlign: 'center', marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5,
    },
    listScrollContainer: { flex: 1 },
    detailScrollContainer: { flex: 1 },
    scrollContentContainer: { paddingBottom: 40, flexGrow: 1 },
    container: {
        flex: 1,
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 30),
        paddingTop: 0,
        maxWidth: 1300,
        alignSelf: 'center',
        width: '100%',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        width: '100%',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 10,
        padding: 5,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    activeTabText: {
        color: 'white',
    },
    mealPlanCard: {
        width: isMobile ? '100%' : '48%',
        aspectRatio: 2,
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: isMobile ? 10 : 15,
    },
    mealPlanCardTablet: {
        width: '48%',
        aspectRatio: 2.5,
    },
    mealPlanImage: {
        flex: 1,
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mealPlanDetailContainer: {
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 25),
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    mealPlanDayContainer: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        padding: isMobile ? 12 : (isTablet ? 15 : 15),
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    mealPlanDayTitle: {
        fontSize: isMobile ? 16 : (isTablet ? 17 : 18),
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    mealPlanMealItem: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(240,240,240,0.8)',
        borderRadius: 8,
        marginBottom: 8,
    },
    mealPlanMealType: {
        fontSize: isMobile ? 13 : (isTablet ? 14 : 14),
        fontWeight: '600',
        color: '#555',
    },
    mealPlanMealName: {
        fontSize: isMobile ? 15 : (isTablet ? 16 : 16),
        color: '#333',
        marginTop: 4,
    },
    mealPlanName: {
        fontSize: isMobile ? 16 : (isTablet ? 17 : 18),
        fontWeight: "bold",
        color: "white",
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    detailContentWrapper: {
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 25),
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    detailHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 15,
        marginBottom: 20,
        width: '100%',
    },
    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    detailTitle: {
        flex: 1,
        fontSize: isMobile ? 20 : (isTablet ? 22 : 24),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginHorizontal: 10,
    },
    detailHeartButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    headerPlaceholderRight: {
        width: 36,
        height: 36,
    },
    detailTopRowContainer: {
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        marginBottom: 20,
        gap: isMobile ? 15 : (isTablet ? 15 : 20),
        alignItems: 'center',
    },
    detailImageContainer: {
        width: isMobile ? '80%' : (isTablet ? '45%' : '40%'),
        aspectRatio: 1,
        borderRadius: 240,
        overflow: 'hidden',
        backgroundColor: '#eee',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
        alignSelf: isMobile ? 'center' : undefined,
    },
    detailImageContainerTablet: {
        width: '45%',
        borderRadius: 200,
    },
    detailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 240,
    },
    detailIngredientsContainer: {
        width: isMobile ? '100%' : (isTablet ? '50%' : '55%'),
        padding: isMobile ? 15 : (isTablet ? 15 : 20),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    detailIngredientsContainerTablet: {
        width: '50%',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: isMobile ? 18 : (isTablet ? 19 : 20),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    ingredientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    ingredientIcon: {
        marginRight: 8,
        marginTop: 2
    },
    ingredientText: {
        fontSize: isMobile ? 15 : (isTablet ? 15 : 16),
        color: '#555',
        flex: 1
    },
    detailInstructionsContainer: {
        width: '100%',
        padding: isMobile ? 15 : (isTablet ? 15 : 20),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 60,
    },
    instructionsText: {
        fontSize: isMobile ? 15 : (isTablet ? 15 : 16),
        color: '#444',
        lineHeight: isMobile ? 22 : (isTablet ? 22 : 24)
    },
    flatListStyle: {
        alignSelf: 'center',
        paddingHorizontal: 5,
        width: '100%',
    },
    listContainerPadding: {
        paddingBottom: 0
    },
    columnWrapper: {
        gap: 15,
        marginBottom: 15,
    },
    columnWrapperTablet: {
        gap: 12,
        marginBottom: 12,
    },
    columnWrapperMobile: {
        gap: 10,
        marginBottom: 10,
    },
    recipeCard: {
        width: isMobile ? '48%' : (isTablet ? '31%' : '23.5%'),
        aspectRatio: 1,
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    recipeCardTablet: {
        width: '31%',
    },
    recipeImage: {
        flex: 1,
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageStyle: {
        borderRadius: 12,
    },
    imageOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: isMobile ? 10 : (isTablet ? 10 : 12),
        paddingVertical: isMobile ? 8 : (isTablet ? 8 : 10),
        height: 90,
        paddingBottom: 8
    },
    recipeName: {
        fontSize: isMobile ? 15 : (isTablet ? 16 : 17),
        fontWeight: "bold",
        color: "white",
        marginBottom: 8,
    },
    recipeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewRecipeText: {
        color: 'rgba(255,255,255, 0.9)',
        fontSize: isMobile ? 13 : (isTablet ? 13 : 14),
        fontWeight: '500',
    },
    heartButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        padding: 6,
        zIndex: 10,
    },
});